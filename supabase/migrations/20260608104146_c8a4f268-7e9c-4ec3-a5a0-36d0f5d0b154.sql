
CREATE OR REPLACE FUNCTION public.fn_hapus_barang_masuk(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; v_batch RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Hanya admin yang dapat menghapus transaksi';
  END IF;
  SELECT * INTO r FROM public.incoming_goods WHERE id = p_id;
  IF r IS NULL THEN RAISE EXCEPTION 'Transaksi tidak ditemukan'; END IF;

  -- cari batch yang sesuai & masih utuh (belum terpakai sama sekali)
  SELECT * INTO v_batch FROM public.stock_batches
    WHERE product_id = r.product_id
      AND jumlah_masuk = r.jumlah
      AND harga_beli = r.harga_beli
      AND sisa_stok = jumlah_masuk
      AND abs(extract(epoch from (tanggal_masuk - r.tanggal_masuk))) < 5
    ORDER BY tanggal_masuk DESC LIMIT 1;
  IF v_batch IS NULL THEN
    RAISE EXCEPTION 'Batch sudah terpakai sebagian/seluruhnya. Gunakan penyesuaian stok untuk mengoreksi.';
  END IF;

  DELETE FROM public.stock_batches WHERE id = v_batch.id;
  UPDATE public.products SET stok = stok - r.jumlah WHERE id = r.product_id;
  INSERT INTO public.stock_adjustments(product_id, jenis_penyesuaian, jumlah, keterangan, created_by)
    VALUES (r.product_id, 'koreksi', -r.jumlah, 'Hapus barang masuk #' || p_id, auth.uid());
  DELETE FROM public.incoming_goods WHERE id = p_id;
END; $$;

CREATE OR REPLACE FUNCTION public.fn_hapus_barang_keluar(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; b RECORD; v_rem INTEGER; v_add INTEGER;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Hanya admin yang dapat menghapus transaksi';
  END IF;
  SELECT * INTO r FROM public.outgoing_goods WHERE id = p_id;
  IF r IS NULL THEN RAISE EXCEPTION 'Transaksi tidak ditemukan'; END IF;

  v_rem := r.jumlah;
  -- kembalikan ke batch terbaru dulu (reverse FIFO) sesuai kapasitas yang hilang
  FOR b IN SELECT id, jumlah_masuk, sisa_stok FROM public.stock_batches
    WHERE product_id = r.product_id AND sisa_stok < jumlah_masuk
    ORDER BY tanggal_masuk DESC LOOP
    EXIT WHEN v_rem <= 0;
    v_add := LEAST(b.jumlah_masuk - b.sisa_stok, v_rem);
    UPDATE public.stock_batches SET sisa_stok = sisa_stok + v_add WHERE id = b.id;
    v_rem := v_rem - v_add;
  END LOOP;

  UPDATE public.products SET stok = stok + r.jumlah WHERE id = r.product_id;
  INSERT INTO public.stock_adjustments(product_id, jenis_penyesuaian, jumlah, keterangan, created_by)
    VALUES (r.product_id, 'koreksi', r.jumlah, 'Hapus barang keluar #' || p_id, auth.uid());
  DELETE FROM public.outgoing_goods WHERE id = p_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.fn_hapus_barang_masuk(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_hapus_barang_keluar(uuid) TO authenticated;
