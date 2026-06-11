
-- 1) Add role checks to mutation RPCs
CREATE OR REPLACE FUNCTION public.fn_barang_masuk(
  p_product_id UUID, p_jumlah INTEGER, p_harga NUMERIC, p_supplier TEXT, p_tanggal TIMESTAMPTZ
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gudang')) THEN
    RAISE EXCEPTION 'Insufficient privileges' USING ERRCODE = '42501';
  END IF;
  IF p_jumlah <= 0 THEN RAISE EXCEPTION 'Jumlah harus > 0'; END IF;
  INSERT INTO public.stock_batches(product_id, jumlah_masuk, sisa_stok, harga_beli, tanggal_masuk)
    VALUES (p_product_id, p_jumlah, p_jumlah, p_harga, COALESCE(p_tanggal, now()));
  INSERT INTO public.incoming_goods(product_id, jumlah, harga_beli, supplier, tanggal_masuk, created_by)
    VALUES (p_product_id, p_jumlah, p_harga, p_supplier, COALESCE(p_tanggal, now()), auth.uid())
    RETURNING id INTO v_id;
  UPDATE public.products SET stok = stok + p_jumlah WHERE id = p_product_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.fn_barang_keluar(
  p_product_id UUID, p_jumlah INTEGER, p_jenis TEXT, p_tanggal TIMESTAMPTZ
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id UUID; v_remaining INTEGER := p_jumlah; v_hpp NUMERIC := 0;
  v_take INTEGER; r RECORD; v_stok INTEGER;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gudang') OR public.has_role(auth.uid(),'kasir')) THEN
    RAISE EXCEPTION 'Insufficient privileges' USING ERRCODE = '42501';
  END IF;
  IF p_jumlah <= 0 THEN RAISE EXCEPTION 'Jumlah harus > 0'; END IF;
  SELECT stok INTO v_stok FROM public.products WHERE id = p_product_id;
  IF v_stok IS NULL THEN RAISE EXCEPTION 'Barang tidak ditemukan'; END IF;
  IF v_stok < p_jumlah THEN RAISE EXCEPTION 'Stok tidak mencukupi (tersedia: %)', v_stok; END IF;

  FOR r IN SELECT id, sisa_stok, harga_beli FROM public.stock_batches
    WHERE product_id = p_product_id AND sisa_stok > 0
    ORDER BY tanggal_masuk ASC LOOP
    EXIT WHEN v_remaining <= 0;
    v_take := LEAST(r.sisa_stok, v_remaining);
    v_hpp := v_hpp + (v_take * r.harga_beli);
    UPDATE public.stock_batches SET sisa_stok = sisa_stok - v_take WHERE id = r.id;
    v_remaining := v_remaining - v_take;
  END LOOP;

  INSERT INTO public.outgoing_goods(product_id, jumlah, jenis_keluar, hpp, tanggal_keluar, created_by)
    VALUES (p_product_id, p_jumlah, p_jenis, v_hpp, COALESCE(p_tanggal, now()), auth.uid())
    RETURNING id INTO v_id;
  UPDATE public.products SET stok = stok - p_jumlah WHERE id = p_product_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.fn_penyesuaian(
  p_product_id UUID, p_jenis TEXT, p_jumlah INTEGER, p_keterangan TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID; v_stok INTEGER;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gudang')) THEN
    RAISE EXCEPTION 'Insufficient privileges' USING ERRCODE = '42501';
  END IF;
  SELECT stok INTO v_stok FROM public.products WHERE id = p_product_id;
  IF v_stok IS NULL THEN RAISE EXCEPTION 'Barang tidak ditemukan'; END IF;
  IF v_stok + p_jumlah < 0 THEN RAISE EXCEPTION 'Stok akan negatif'; END IF;
  INSERT INTO public.stock_adjustments(product_id, jenis_penyesuaian, jumlah, keterangan, created_by)
    VALUES (p_product_id, p_jenis, p_jumlah, p_keterangan, auth.uid()) RETURNING id INTO v_id;
  UPDATE public.products SET stok = stok + p_jumlah WHERE id = p_product_id;
  RETURN v_id;
END; $$;

-- 2) Hardcode default role 'kasir' on signup; ignore client metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nama)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nama', split_part(NEW.email,'@',1)));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'kasir');
  RETURN NEW;
END;
$$;

-- 3) Revoke EXECUTE from anon on all SECURITY DEFINER RPCs
REVOKE EXECUTE ON FUNCTION public.fn_barang_masuk(UUID, INTEGER, NUMERIC, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_barang_keluar(UUID, INTEGER, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_penyesuaian(UUID, TEXT, INTEGER, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_hapus_barang_masuk(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_hapus_barang_keluar(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_barang_masuk(UUID, INTEGER, NUMERIC, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_barang_keluar(UUID, INTEGER, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_penyesuaian(UUID, TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_hapus_barang_masuk(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_hapus_barang_keluar(UUID) TO authenticated;

-- 4) Tighten outgoing_goods INSERT to staff (admin/gudang/kasir, but not anon)
DROP POLICY IF EXISTS "out_insert_auth" ON public.outgoing_goods;
CREATE POLICY "out_insert_staff" ON public.outgoing_goods FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gudang') OR public.has_role(auth.uid(),'kasir')
);

-- 5) Tighten stock_batches writes to admin/gudang; keep SELECT for authenticated
DROP POLICY IF EXISTS "batches_all_auth" ON public.stock_batches;
CREATE POLICY "batches_select_auth" ON public.stock_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "batches_insert_staff" ON public.stock_batches FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gudang')
);
CREATE POLICY "batches_update_staff" ON public.stock_batches FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gudang')
) WITH CHECK (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gudang')
);
CREATE POLICY "batches_delete_admin" ON public.stock_batches FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(),'admin')
);

-- 6) Restrict user_roles SELECT to self or admin
DROP POLICY IF EXISTS "user_roles_select_auth" ON public.user_roles;
CREATE POLICY "user_roles_select_self_or_admin" ON public.user_roles FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR public.has_role(auth.uid(),'admin')
);

-- 7) Tighten storage policies for product-images bucket
DROP POLICY IF EXISTS "product_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "product_images_update" ON storage.objects;
DROP POLICY IF EXISTS "product_images_delete" ON storage.objects;
CREATE POLICY "product_images_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gudang'))
  );
CREATE POLICY "product_images_update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gudang'))
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gudang'))
  );
CREATE POLICY "product_images_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gudang'))
  );
