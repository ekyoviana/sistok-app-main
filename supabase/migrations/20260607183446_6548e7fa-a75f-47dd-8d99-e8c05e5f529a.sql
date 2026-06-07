
-- Enum role
CREATE TYPE public.app_role AS ENUM ('admin', 'gudang', 'kasir');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_auth" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- has_role function (security definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Trigger: auto-create profile + default 'kasir' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nama)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nama', split_part(NEW.email,'@',1)));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'kasir'));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_barang TEXT NOT NULL UNIQUE,
  nama_barang TEXT NOT NULL,
  gambar_barang TEXT,
  barcode TEXT,
  kategori TEXT,
  harga_jual NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (harga_jual >= 0),
  stok INTEGER NOT NULL DEFAULT 0 CHECK (stok >= 0),
  satuan TEXT NOT NULL DEFAULT 'pcs',
  stok_minimum INTEGER NOT NULL DEFAULT 0,
  stok_maksimum INTEGER NOT NULL DEFAULT 0,
  tanggal_kadaluarsa DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_select_auth" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_insert_staff" ON public.products FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gudang')
);
CREATE POLICY "products_update_staff" ON public.products FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gudang')
);
CREATE POLICY "products_delete_admin" ON public.products FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(),'admin')
);

-- Stock batches (FIFO)
CREATE TABLE public.stock_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  jumlah_masuk INTEGER NOT NULL CHECK (jumlah_masuk > 0),
  sisa_stok INTEGER NOT NULL CHECK (sisa_stok >= 0),
  harga_beli NUMERIC(14,2) NOT NULL DEFAULT 0,
  tanggal_masuk TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_batches TO authenticated;
GRANT ALL ON public.stock_batches TO service_role;
ALTER TABLE public.stock_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "batches_all_auth" ON public.stock_batches FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Incoming goods
CREATE TABLE public.incoming_goods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  jumlah INTEGER NOT NULL CHECK (jumlah > 0),
  harga_beli NUMERIC(14,2) NOT NULL DEFAULT 0,
  supplier TEXT,
  tanggal_masuk TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.incoming_goods TO authenticated;
GRANT ALL ON public.incoming_goods TO service_role;
ALTER TABLE public.incoming_goods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "in_select" ON public.incoming_goods FOR SELECT TO authenticated USING (true);
CREATE POLICY "in_insert_staff" ON public.incoming_goods FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gudang')
);

-- Outgoing goods
CREATE TABLE public.outgoing_goods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  jumlah INTEGER NOT NULL CHECK (jumlah > 0),
  jenis_keluar TEXT NOT NULL DEFAULT 'penjualan',
  hpp NUMERIC(14,2) NOT NULL DEFAULT 0,
  tanggal_keluar TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.outgoing_goods TO authenticated;
GRANT ALL ON public.outgoing_goods TO service_role;
ALTER TABLE public.outgoing_goods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "out_select" ON public.outgoing_goods FOR SELECT TO authenticated USING (true);
CREATE POLICY "out_insert_auth" ON public.outgoing_goods FOR INSERT TO authenticated WITH CHECK (true);

-- Stock adjustments
CREATE TABLE public.stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  jenis_penyesuaian TEXT NOT NULL,
  jumlah INTEGER NOT NULL,
  keterangan TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.stock_adjustments TO authenticated;
GRANT ALL ON public.stock_adjustments TO service_role;
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "adj_select" ON public.stock_adjustments FOR SELECT TO authenticated USING (true);
CREATE POLICY "adj_insert_staff" ON public.stock_adjustments FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gudang')
);

-- RPC: barang masuk (create batch + insert incoming + add stock)
CREATE OR REPLACE FUNCTION public.fn_barang_masuk(
  p_product_id UUID, p_jumlah INTEGER, p_harga NUMERIC, p_supplier TEXT, p_tanggal TIMESTAMPTZ
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF p_jumlah <= 0 THEN RAISE EXCEPTION 'Jumlah harus > 0'; END IF;
  INSERT INTO public.stock_batches(product_id, jumlah_masuk, sisa_stok, harga_beli, tanggal_masuk)
    VALUES (p_product_id, p_jumlah, p_jumlah, p_harga, COALESCE(p_tanggal, now()));
  INSERT INTO public.incoming_goods(product_id, jumlah, harga_beli, supplier, tanggal_masuk, created_by)
    VALUES (p_product_id, p_jumlah, p_harga, p_supplier, COALESCE(p_tanggal, now()), auth.uid())
    RETURNING id INTO v_id;
  UPDATE public.products SET stok = stok + p_jumlah WHERE id = p_product_id;
  RETURN v_id;
END; $$;

-- RPC: barang keluar FIFO
CREATE OR REPLACE FUNCTION public.fn_barang_keluar(
  p_product_id UUID, p_jumlah INTEGER, p_jenis TEXT, p_tanggal TIMESTAMPTZ
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id UUID; v_remaining INTEGER := p_jumlah; v_hpp NUMERIC := 0;
  v_take INTEGER; r RECORD; v_stok INTEGER;
BEGIN
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

-- RPC: penyesuaian stok (jumlah bisa + atau -)
CREATE OR REPLACE FUNCTION public.fn_penyesuaian(
  p_product_id UUID, p_jenis TEXT, p_jumlah INTEGER, p_keterangan TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID; v_stok INTEGER;
BEGIN
  SELECT stok INTO v_stok FROM public.products WHERE id = p_product_id;
  IF v_stok IS NULL THEN RAISE EXCEPTION 'Barang tidak ditemukan'; END IF;
  IF v_stok + p_jumlah < 0 THEN RAISE EXCEPTION 'Stok akan negatif'; END IF;
  INSERT INTO public.stock_adjustments(product_id, jenis_penyesuaian, jumlah, keterangan, created_by)
    VALUES (p_product_id, p_jenis, p_jumlah, p_keterangan, auth.uid()) RETURNING id INTO v_id;
  UPDATE public.products SET stok = stok + p_jumlah WHERE id = p_product_id;
  RETURN v_id;
END; $$;
