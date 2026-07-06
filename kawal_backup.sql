--
-- PostgreSQL database dump
--

\restrict fYPa8b5Krln9nJeGvBmz4dBoqUa9HkXLMJgWYw2Ob10io1pyZqYqtRgLL1QwF4P

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-07-06 10:53:29 WIB

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE ONLY public."TransaksiRemisi" DROP CONSTRAINT "TransaksiRemisi_siswaId_fkey";
ALTER TABLE ONLY public."TransaksiRemisi" DROP CONSTRAINT "TransaksiRemisi_masterRemisiId_fkey";
ALTER TABLE ONLY public."TransaksiRemisi" DROP CONSTRAINT "TransaksiRemisi_approverId_fkey";
ALTER TABLE ONLY public."SiswaKelas" DROP CONSTRAINT "SiswaKelas_tahunAjaranId_fkey";
ALTER TABLE ONLY public."SiswaKelas" DROP CONSTRAINT "SiswaKelas_siswaId_fkey";
ALTER TABLE ONLY public."SiswaKelas" DROP CONSTRAINT "SiswaKelas_kelasId_fkey";
ALTER TABLE ONLY public."RujukanSiswa" DROP CONSTRAINT "RujukanSiswa_siswaId_fkey";
ALTER TABLE ONLY public."RujukanSiswa" DROP CONSTRAINT "RujukanSiswa_pembuatId_fkey";
ALTER TABLE ONLY public."PenangananSiswa" DROP CONSTRAINT "PenangananSiswa_siswaId_fkey";
ALTER TABLE ONLY public."PenangananSiswa" DROP CONSTRAINT "PenangananSiswa_petugasId_fkey";
ALTER TABLE ONLY public."PemanggilanSiswa" DROP CONSTRAINT "PemanggilanSiswa_siswaId_fkey";
ALTER TABLE ONLY public."LaporanPelanggaran" DROP CONSTRAINT "LaporanPelanggaran_siswaId_fkey";
ALTER TABLE ONLY public."LaporanPelanggaran" DROP CONSTRAINT "LaporanPelanggaran_pelaporId_fkey";
ALTER TABLE ONLY public."LaporanPelanggaran" DROP CONSTRAINT "LaporanPelanggaran_detailPelanggaranId_fkey";
ALTER TABLE ONLY public."LaporanPelanggaran" DROP CONSTRAINT "LaporanPelanggaran_approverId_fkey";
ALTER TABLE ONLY public."Kelas" DROP CONSTRAINT "Kelas_walasId_fkey";
ALTER TABLE ONLY public."Kelas" DROP CONSTRAINT "Kelas_tahunAjaranId_fkey";
ALTER TABLE ONLY public."Kelas" DROP CONSTRAINT "Kelas_bkId_fkey";
ALTER TABLE ONLY public."JurnalPenilaian" DROP CONSTRAINT "JurnalPenilaian_siswaId_fkey";
ALTER TABLE ONLY public."JurnalPenilaian" DROP CONSTRAINT "JurnalPenilaian_jurnalId_fkey";
ALTER TABLE ONLY public."JurnalMengajar" DROP CONSTRAINT "JurnalMengajar_mapelId_fkey";
ALTER TABLE ONLY public."JurnalMengajar" DROP CONSTRAINT "JurnalMengajar_kelasId_fkey";
ALTER TABLE ONLY public."JurnalMengajar" DROP CONSTRAINT "JurnalMengajar_jadwalId_fkey";
ALTER TABLE ONLY public."JurnalMengajar" DROP CONSTRAINT "JurnalMengajar_guruId_fkey";
ALTER TABLE ONLY public."JurnalAbsensi" DROP CONSTRAINT "JurnalAbsensi_siswaId_fkey";
ALTER TABLE ONLY public."JurnalAbsensi" DROP CONSTRAINT "JurnalAbsensi_jurnalId_fkey";
ALTER TABLE ONLY public."JadwalPelajaran" DROP CONSTRAINT "JadwalPelajaran_mapelId_fkey";
ALTER TABLE ONLY public."JadwalPelajaran" DROP CONSTRAINT "JadwalPelajaran_kelasId_fkey";
ALTER TABLE ONLY public."JadwalPelajaran" DROP CONSTRAINT "JadwalPelajaran_guruId_fkey";
ALTER TABLE ONLY public."DetailPelanggaran" DROP CONSTRAINT "DetailPelanggaran_kategoriId_fkey";
ALTER TABLE ONLY public."BimbinganKonseling" DROP CONSTRAINT "BimbinganKonseling_siswaId_fkey";
ALTER TABLE ONLY public."BimbinganKonseling" DROP CONSTRAINT "BimbinganKonseling_pembimbingId_fkey";
ALTER TABLE ONLY public."Absensi" DROP CONSTRAINT "Absensi_siswaId_fkey";
ALTER TABLE ONLY public."Absensi" DROP CONSTRAINT "Absensi_pencatatId_fkey";
DROP INDEX public."User_username_key";
DROP INDEX public."User_nip_key";
DROP INDEX public."TahunAjaran_nama_key";
DROP INDEX public."Siswa_nis_key";
DROP INDEX public."SiswaKelas_siswaId_tahunAjaranId_key";
DROP INDEX public."PemanggilanSiswa_siswaId_thresholdPoints_key";
DROP INDEX public."MataPelajaran_kode_key";
DROP INDEX public."MasterRemisi_nama_key";
DROP INDEX public."Kelas_walasId_key";
DROP INDEX public."KategoriPelanggaran_nama_key";
DROP INDEX public."HariLibur_tanggal_key";
DROP INDEX public."AppSetting_key_key";
DROP INDEX public."Absensi_siswaId_tanggal_key";
ALTER TABLE ONLY public."User" DROP CONSTRAINT "User_pkey";
ALTER TABLE ONLY public."TransaksiRemisi" DROP CONSTRAINT "TransaksiRemisi_pkey";
ALTER TABLE ONLY public."TahunAjaran" DROP CONSTRAINT "TahunAjaran_pkey";
ALTER TABLE ONLY public."Siswa" DROP CONSTRAINT "Siswa_pkey";
ALTER TABLE ONLY public."SiswaKelas" DROP CONSTRAINT "SiswaKelas_pkey";
ALTER TABLE ONLY public."RujukanSiswa" DROP CONSTRAINT "RujukanSiswa_pkey";
ALTER TABLE ONLY public."PenangananSiswa" DROP CONSTRAINT "PenangananSiswa_pkey";
ALTER TABLE ONLY public."PemanggilanSiswa" DROP CONSTRAINT "PemanggilanSiswa_pkey";
ALTER TABLE ONLY public."MataPelajaran" DROP CONSTRAINT "MataPelajaran_pkey";
ALTER TABLE ONLY public."MasterRemisi" DROP CONSTRAINT "MasterRemisi_pkey";
ALTER TABLE ONLY public."LaporanPelanggaran" DROP CONSTRAINT "LaporanPelanggaran_pkey";
ALTER TABLE ONLY public."Kelas" DROP CONSTRAINT "Kelas_pkey";
ALTER TABLE ONLY public."KategoriPelanggaran" DROP CONSTRAINT "KategoriPelanggaran_pkey";
ALTER TABLE ONLY public."JurnalPenilaian" DROP CONSTRAINT "JurnalPenilaian_pkey";
ALTER TABLE ONLY public."JurnalMengajar" DROP CONSTRAINT "JurnalMengajar_pkey";
ALTER TABLE ONLY public."JurnalAbsensi" DROP CONSTRAINT "JurnalAbsensi_pkey";
ALTER TABLE ONLY public."JamPelajaran" DROP CONSTRAINT "JamPelajaran_pkey";
ALTER TABLE ONLY public."JadwalPelajaran" DROP CONSTRAINT "JadwalPelajaran_pkey";
ALTER TABLE ONLY public."HariLibur" DROP CONSTRAINT "HariLibur_pkey";
ALTER TABLE ONLY public."DetailPelanggaran" DROP CONSTRAINT "DetailPelanggaran_pkey";
ALTER TABLE ONLY public."BimbinganKonseling" DROP CONSTRAINT "BimbinganKonseling_pkey";
ALTER TABLE ONLY public."AppSetting" DROP CONSTRAINT "AppSetting_pkey";
ALTER TABLE ONLY public."Absensi" DROP CONSTRAINT "Absensi_pkey";
DROP TABLE public."User";
DROP TABLE public."TransaksiRemisi";
DROP TABLE public."TahunAjaran";
DROP TABLE public."SiswaKelas";
DROP TABLE public."Siswa";
DROP TABLE public."RujukanSiswa";
DROP TABLE public."PenangananSiswa";
DROP TABLE public."PemanggilanSiswa";
DROP TABLE public."MataPelajaran";
DROP TABLE public."MasterRemisi";
DROP TABLE public."LaporanPelanggaran";
DROP TABLE public."Kelas";
DROP TABLE public."KategoriPelanggaran";
DROP TABLE public."JurnalPenilaian";
DROP TABLE public."JurnalMengajar";
DROP TABLE public."JurnalAbsensi";
DROP TABLE public."JamPelajaran";
DROP TABLE public."JadwalPelajaran";
DROP TABLE public."HariLibur";
DROP TABLE public."DetailPelanggaran";
DROP TABLE public."BimbinganKonseling";
DROP TABLE public."AppSetting";
DROP TABLE public."Absensi";
DROP TYPE public."ViolationStatus";
DROP TYPE public."Role";
DROP TYPE public."AttendanceStatus";
--
-- TOC entry 877 (class 1247 OID 25918)
-- Name: AttendanceStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AttendanceStatus" AS ENUM (
    'H',
    'S',
    'I',
    'A',
    'D'
);


ALTER TYPE public."AttendanceStatus" OWNER TO postgres;

--
-- TOC entry 874 (class 1247 OID 25910)
-- Name: Role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Role" AS ENUM (
    'BK',
    'WALAS',
    'GURU',
    'WAKA'
);


ALTER TYPE public."Role" OWNER TO postgres;

--
-- TOC entry 880 (class 1247 OID 25930)
-- Name: ViolationStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ViolationStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public."ViolationStatus" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 228 (class 1259 OID 26051)
-- Name: Absensi; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Absensi" (
    id text NOT NULL,
    "siswaId" text NOT NULL,
    tanggal date NOT NULL,
    status public."AttendanceStatus" DEFAULT 'H'::public."AttendanceStatus" NOT NULL,
    "pencatatId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Absensi" OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 26187)
-- Name: AppSetting; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AppSetting" (
    id text NOT NULL,
    key text NOT NULL,
    value text NOT NULL
);


ALTER TABLE public."AppSetting" OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 26283)
-- Name: BimbinganKonseling; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."BimbinganKonseling" (
    id text NOT NULL,
    "siswaId" text NOT NULL,
    "pembimbingId" text NOT NULL,
    bidang text NOT NULL,
    masalah text NOT NULL,
    solusi text NOT NULL,
    "catatanRahasia" text,
    tanggal timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."BimbinganKonseling" OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 26002)
-- Name: DetailPelanggaran; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DetailPelanggaran" (
    id text NOT NULL,
    "kategoriId" text NOT NULL,
    nama text NOT NULL,
    poin integer NOT NULL
);


ALTER TABLE public."DetailPelanggaran" OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 26140)
-- Name: HariLibur; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."HariLibur" (
    id text NOT NULL,
    tanggal date NOT NULL,
    keterangan text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."HariLibur" OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 26346)
-- Name: JadwalPelajaran; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."JadwalPelajaran" (
    id text NOT NULL,
    "kelasId" text NOT NULL,
    "guruId" text NOT NULL,
    "mapelId" text NOT NULL,
    hari integer NOT NULL,
    "jamMulai" integer NOT NULL,
    "jamSelesai" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."JadwalPelajaran" OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 26332)
-- Name: JamPelajaran; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."JamPelajaran" (
    id text NOT NULL,
    "hariTipe" text NOT NULL,
    "jamKe" integer NOT NULL,
    "waktuMulai" text NOT NULL,
    "waktuSelesai" text NOT NULL,
    "isIstirahat" boolean DEFAULT false NOT NULL,
    keterangan text
);


ALTER TABLE public."JamPelajaran" OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 26380)
-- Name: JurnalAbsensi; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."JurnalAbsensi" (
    id text NOT NULL,
    "jurnalId" text NOT NULL,
    "siswaId" text NOT NULL,
    status text NOT NULL
);


ALTER TABLE public."JurnalAbsensi" OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 26362)
-- Name: JurnalMengajar; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."JurnalMengajar" (
    id text NOT NULL,
    "jadwalId" text,
    "kelasId" text NOT NULL,
    "guruId" text NOT NULL,
    "mapelId" text NOT NULL,
    "jamMulai" integer NOT NULL,
    "jamSelesai" integer NOT NULL,
    tanggal date NOT NULL,
    "namaJurnal" text NOT NULL,
    kegiatan text NOT NULL,
    foto text,
    "fotoKeterangan" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."JurnalMengajar" OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 26391)
-- Name: JurnalPenilaian; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."JurnalPenilaian" (
    id text NOT NULL,
    "jurnalId" text NOT NULL,
    "siswaId" text NOT NULL,
    nilai integer NOT NULL,
    keterangan text
);


ALTER TABLE public."JurnalPenilaian" OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 25993)
-- Name: KategoriPelanggaran; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."KategoriPelanggaran" (
    id text NOT NULL,
    nama text NOT NULL
);


ALTER TABLE public."KategoriPelanggaran" OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 25965)
-- Name: Kelas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Kelas" (
    id text NOT NULL,
    nama text NOT NULL,
    "tahunAjaranId" text NOT NULL,
    "walasId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "bkId" text
);


ALTER TABLE public."Kelas" OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 26013)
-- Name: LaporanPelanggaran; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."LaporanPelanggaran" (
    id text NOT NULL,
    "siswaId" text NOT NULL,
    "detailPelanggaranId" text NOT NULL,
    "pelaporId" text NOT NULL,
    tanggal timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status public."ViolationStatus" DEFAULT 'PENDING'::public."ViolationStatus" NOT NULL,
    "approverId" text,
    "approvedAt" timestamp(3) without time zone,
    notes text,
    bukti text[] DEFAULT ARRAY[]::text[],
    "isCensored" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."LaporanPelanggaran" OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 26028)
-- Name: MasterRemisi; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MasterRemisi" (
    id text NOT NULL,
    nama text NOT NULL,
    "persentasePengurangan" integer NOT NULL
);


ALTER TABLE public."MasterRemisi" OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 26320)
-- Name: MataPelajaran; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MataPelajaran" (
    id text NOT NULL,
    kode text NOT NULL,
    nama text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."MataPelajaran" OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 26197)
-- Name: PemanggilanSiswa; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PemanggilanSiswa" (
    id text NOT NULL,
    "siswaId" text NOT NULL,
    "thresholdPoints" integer NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "suratPerjanjian" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "resolvedAt" timestamp(3) without time zone
);


ALTER TABLE public."PemanggilanSiswa" OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 26232)
-- Name: PenangananSiswa; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PenangananSiswa" (
    id text NOT NULL,
    "siswaId" text NOT NULL,
    kasus text NOT NULL,
    solusi text NOT NULL,
    bukti text[] DEFAULT ARRAY[]::text[],
    "petugasId" text NOT NULL,
    tanggal timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."PenangananSiswa" OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 26265)
-- Name: RujukanSiswa; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RujukanSiswa" (
    id text NOT NULL,
    "siswaId" text NOT NULL,
    "pembuatId" text NOT NULL,
    kategori text NOT NULL,
    deskripsi text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "tindakLanjut" text,
    tanggal timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RujukanSiswa" OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 25977)
-- Name: Siswa; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Siswa" (
    id text NOT NULL,
    nis text NOT NULL,
    nama text NOT NULL,
    status text DEFAULT 'AKTIF'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Siswa" OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 26158)
-- Name: SiswaKelas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SiswaKelas" (
    id text NOT NULL,
    "siswaId" text NOT NULL,
    "kelasId" text NOT NULL,
    "tahunAjaranId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SiswaKelas" OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 25952)
-- Name: TahunAjaran; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TahunAjaran" (
    id text NOT NULL,
    nama text NOT NULL,
    "isActive" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "ganjilMulai" date,
    "ganjilSelesai" date,
    "genapMulai" date,
    "genapSelesai" date,
    "semesterAktif" text DEFAULT 'GANJIL'::text NOT NULL
);


ALTER TABLE public."TahunAjaran" OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 26038)
-- Name: TransaksiRemisi; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TransaksiRemisi" (
    id text NOT NULL,
    "siswaId" text NOT NULL,
    jenis text NOT NULL,
    "masterRemisiId" text,
    "poinDikurangi" integer NOT NULL,
    tanggal timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "approverId" text,
    bukti text[] DEFAULT ARRAY[]::text[]
);


ALTER TABLE public."TransaksiRemisi" OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 25937)
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    username text NOT NULL,
    "passwordHash" text NOT NULL,
    nama text NOT NULL,
    role public."Role" NOT NULL,
    "whatsappNumber" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    nip text
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- TOC entry 4702 (class 0 OID 26051)
-- Dependencies: 228
-- Data for Name: Absensi; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Absensi" (id, "siswaId", tanggal, status, "pencatatId", "createdAt") FROM stdin;
\.


--
-- TOC entry 4705 (class 0 OID 26187)
-- Dependencies: 231
-- Data for Name: AppSetting; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AppSetting" (id, key, value) FROM stdin;
9ee891a1-1daf-4255-ba70-5b206495e8c5	libur_sabtu	true
d7d1ca7e-0b2e-4135-a2fa-1a508c9f6dae	libur_minggu	true
937d38eb-190e-4d0d-beeb-a651d5d14a00	school_logo	/uploads/school_logo_1782445832575.png
da8241a2-af47-4c4d-9a57-82c79ba4a44f	threshold_1	25
325aedbb-0c6c-4e87-ad17-57649931396e	threshold_2	50
4148935f-7371-4dcf-891a-63c4e725ed07	threshold_3	75
74877ff3-c260-4982-8218-7122c980f60b	school_name	SMAN 6 Tangerang
55873576-41b2-4e1e-96a7-5ff877664aa5	school_city	Tangerang
a9dcf9a1-72b5-48a9-8f8c-ce275ca24135	waka_name	Anwar Muasilin, M.Pd,
a9ee67a3-0508-46c4-969d-1f44a2c5ef74	waka_nip	197508122000031001
cd4f23cd-0d55-43b3-a2a2-57efa7b2d963	school_header	/uploads/school_header_1782455147467.png
d8b72432-f930-41a2-a949-6fe886716d36	last_automatic_remission_check	2026-07-06
\.


--
-- TOC entry 4709 (class 0 OID 26283)
-- Dependencies: 235
-- Data for Name: BimbinganKonseling; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."BimbinganKonseling" (id, "siswaId", "pembimbingId", bidang, masalah, solusi, "catatanRahasia", tanggal, "createdAt") FROM stdin;
\.


--
-- TOC entry 4698 (class 0 OID 26002)
-- Dependencies: 224
-- Data for Name: DetailPelanggaran; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."DetailPelanggaran" (id, "kategoriId", nama, poin) FROM stdin;
e4e2f127-84a1-45c9-a998-9af3d708fe76	d0ce6ea9-3456-4ea8-bdb9-8a92a284e94f	Tidak memakai dasi	5
d53c3131-82ec-4cc7-9ec6-ae56c51d8663	d0ce6ea9-3456-4ea8-bdb9-8a92a284e94f	Rambut panjang melebihi kerah	10
6590083a-4942-4c44-8572-57f922de4484	d0ce6ea9-3456-4ea8-bdb9-8a92a284e94f	Sepatu bukan warna hitam	5
a005bad6-96f7-4d2f-87c3-9f7a0a4f743a	adc86817-b23e-4f9a-87a3-c84cde754434	Terlambat masuk kelas	5
812c8f87-4418-4325-8443-95dbcf321614	adc86817-b23e-4f9a-87a3-c84cde754434	Membolos jam pelajaran	15
c7eb0a42-6bb0-4204-bacb-9ac4c2b56746	adc86817-b23e-4f9a-87a3-c84cde754434	Meninggalkan sekolah tanpa izin	20
64550ed9-0909-4136-a39e-11102472f0b1	b8d82d1b-8509-4c39-b19c-a083f9a6a2af	Merusak fasilitas sekolah	30
512e43d5-c50e-4c0d-aa5a-786830d095b6	b8d82d1b-8509-4c39-b19c-a083f9a6a2af	Berkelahi di lingkungan sekolah	50
5b3255f9-54de-4e45-8cbc-9ee52429e664	b8d82d1b-8509-4c39-b19c-a083f9a6a2af	Menggunakan HP di kelas tanpa izin	10
\.


--
-- TOC entry 4703 (class 0 OID 26140)
-- Dependencies: 229
-- Data for Name: HariLibur; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."HariLibur" (id, tanggal, keterangan, "createdAt") FROM stdin;
\.


--
-- TOC entry 4712 (class 0 OID 26346)
-- Dependencies: 238
-- Data for Name: JadwalPelajaran; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."JadwalPelajaran" (id, "kelasId", "guruId", "mapelId", hari, "jamMulai", "jamSelesai", "createdAt") FROM stdin;
\.


--
-- TOC entry 4711 (class 0 OID 26332)
-- Dependencies: 237
-- Data for Name: JamPelajaran; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."JamPelajaran" (id, "hariTipe", "jamKe", "waktuMulai", "waktuSelesai", "isIstirahat", keterangan) FROM stdin;
231cea3d-e95a-463c-bba9-783672c41756	SENIN	1	07.00	07.45	f	\N
99be6eed-8e44-47f2-8b1f-8a0fe84d3d37	SENIN	2	07:45	08.30	f	\N
3f71eb08-cf90-4ca5-b2cd-aff26f8a2f81	SELASA	1	07.00	07.45	f	\N
9317174c-837f-4258-9822-dfda6004ace1	SELASA	2	07.45	08.30	f	\N
\.


--
-- TOC entry 4714 (class 0 OID 26380)
-- Dependencies: 240
-- Data for Name: JurnalAbsensi; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."JurnalAbsensi" (id, "jurnalId", "siswaId", status) FROM stdin;
\.


--
-- TOC entry 4713 (class 0 OID 26362)
-- Dependencies: 239
-- Data for Name: JurnalMengajar; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."JurnalMengajar" (id, "jadwalId", "kelasId", "guruId", "mapelId", "jamMulai", "jamSelesai", tanggal, "namaJurnal", kegiatan, foto, "fotoKeterangan", "createdAt") FROM stdin;
\.


--
-- TOC entry 4715 (class 0 OID 26391)
-- Dependencies: 241
-- Data for Name: JurnalPenilaian; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."JurnalPenilaian" (id, "jurnalId", "siswaId", nilai, keterangan) FROM stdin;
\.


--
-- TOC entry 4697 (class 0 OID 25993)
-- Dependencies: 223
-- Data for Name: KategoriPelanggaran; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."KategoriPelanggaran" (id, nama) FROM stdin;
d0ce6ea9-3456-4ea8-bdb9-8a92a284e94f	Kerapian
adc86817-b23e-4f9a-87a3-c84cde754434	Kedisiplinan
b8d82d1b-8509-4c39-b19c-a083f9a6a2af	Perilaku
\.


--
-- TOC entry 4695 (class 0 OID 25965)
-- Dependencies: 221
-- Data for Name: Kelas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Kelas" (id, nama, "tahunAjaranId", "walasId", "createdAt", "bkId") FROM stdin;
096b3b03-1ac2-4bbf-863e-d0e1b9fb6d9a	XI RPL 2	83afaae5-6b8f-49da-a1c7-34cd457ad909	87d09d9d-621d-4642-9887-5f06bbb3a6ee	2026-07-03 08:17:57.528	\N
\.


--
-- TOC entry 4699 (class 0 OID 26013)
-- Dependencies: 225
-- Data for Name: LaporanPelanggaran; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."LaporanPelanggaran" (id, "siswaId", "detailPelanggaranId", "pelaporId", tanggal, status, "approverId", "approvedAt", notes, bukti, "isCensored") FROM stdin;
\.


--
-- TOC entry 4700 (class 0 OID 26028)
-- Dependencies: 226
-- Data for Name: MasterRemisi; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MasterRemisi" (id, nama, "persentasePengurangan") FROM stdin;
fb8d90da-f121-497a-b062-eab9f5d4cce2	Bawa Pohon untuk Penghijauan	15
28f49b8e-0213-4f48-8e43-627ccb8438c5	Kerja Bakti Lingkungan	10
e707ef9a-c747-46f6-ab41-544bb7dfc245	Pemutihan Kenaikan Kelas	20
\.


--
-- TOC entry 4710 (class 0 OID 26320)
-- Dependencies: 236
-- Data for Name: MataPelajaran; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MataPelajaran" (id, kode, nama, "createdAt") FROM stdin;
79b1c9a5-6a49-476e-a656-ce44eeddbbf6	SEJ	Sejarah	2026-06-30 04:33:23.054
\.


--
-- TOC entry 4706 (class 0 OID 26197)
-- Dependencies: 232
-- Data for Name: PemanggilanSiswa; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PemanggilanSiswa" (id, "siswaId", "thresholdPoints", status, "suratPerjanjian", "createdAt", "resolvedAt") FROM stdin;
\.


--
-- TOC entry 4707 (class 0 OID 26232)
-- Dependencies: 233
-- Data for Name: PenangananSiswa; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PenangananSiswa" (id, "siswaId", kasus, solusi, bukti, "petugasId", tanggal, "createdAt") FROM stdin;
\.


--
-- TOC entry 4708 (class 0 OID 26265)
-- Dependencies: 234
-- Data for Name: RujukanSiswa; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RujukanSiswa" (id, "siswaId", "pembuatId", kategori, deskripsi, status, "tindakLanjut", tanggal, "createdAt") FROM stdin;
\.


--
-- TOC entry 4696 (class 0 OID 25977)
-- Dependencies: 222
-- Data for Name: Siswa; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Siswa" (id, nis, nama, status, "createdAt", "updatedAt") FROM stdin;
b9d862e1-5058-458d-bcce-330a64f2f028	10291	Ahmad Subagja	AKTIF	2026-07-03 08:17:57.534	2026-07-03 08:17:57.534
04d1bd22-8634-49a6-9aba-a2053e511960	10292	Budi Utomo	AKTIF	2026-07-03 08:17:57.545	2026-07-03 08:17:57.545
0d9fc41e-86f2-43df-811c-76ee1b5088d1	10293	Citra Lestari	AKTIF	2026-07-03 08:17:57.554	2026-07-03 08:17:57.554
c747a6d4-f2c3-42ca-9af2-0b9322a4eeb2	10294	Dani Ramadhan	AKTIF	2026-07-03 08:17:57.564	2026-07-03 08:17:57.564
\.


--
-- TOC entry 4704 (class 0 OID 26158)
-- Dependencies: 230
-- Data for Name: SiswaKelas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SiswaKelas" (id, "siswaId", "kelasId", "tahunAjaranId", "createdAt") FROM stdin;
48917985-4128-416e-bb19-74ed83f5880b	b9d862e1-5058-458d-bcce-330a64f2f028	096b3b03-1ac2-4bbf-863e-d0e1b9fb6d9a	83afaae5-6b8f-49da-a1c7-34cd457ad909	2026-07-03 08:17:57.539
bc2b74a0-e160-4040-8a79-80a0b0d962a3	04d1bd22-8634-49a6-9aba-a2053e511960	096b3b03-1ac2-4bbf-863e-d0e1b9fb6d9a	83afaae5-6b8f-49da-a1c7-34cd457ad909	2026-07-03 08:17:57.55
38ed722a-7a6d-4393-8464-6721af2819c7	0d9fc41e-86f2-43df-811c-76ee1b5088d1	096b3b03-1ac2-4bbf-863e-d0e1b9fb6d9a	83afaae5-6b8f-49da-a1c7-34cd457ad909	2026-07-03 08:17:57.559
8273dafd-4d6d-4465-939d-eb6404e9531c	c747a6d4-f2c3-42ca-9af2-0b9322a4eeb2	096b3b03-1ac2-4bbf-863e-d0e1b9fb6d9a	83afaae5-6b8f-49da-a1c7-34cd457ad909	2026-07-03 08:17:57.568
\.


--
-- TOC entry 4694 (class 0 OID 25952)
-- Dependencies: 220
-- Data for Name: TahunAjaran; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TahunAjaran" (id, nama, "isActive", "createdAt", "ganjilMulai", "ganjilSelesai", "genapMulai", "genapSelesai", "semesterAktif") FROM stdin;
83afaae5-6b8f-49da-a1c7-34cd457ad909	2025/2026	t	2026-07-03 08:17:57.517	\N	\N	\N	\N	GANJIL
ce04a854-1c73-454b-a573-903911bbb164	2026/2027	f	2026-07-03 08:17:57.522	\N	\N	\N	\N	GANJIL
\.


--
-- TOC entry 4701 (class 0 OID 26038)
-- Dependencies: 227
-- Data for Name: TransaksiRemisi; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TransaksiRemisi" (id, "siswaId", jenis, "masterRemisiId", "poinDikurangi", tanggal, "approverId", bukti) FROM stdin;
\.


--
-- TOC entry 4693 (class 0 OID 25937)
-- Dependencies: 219
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, username, "passwordHash", nama, role, "whatsappNumber", "createdAt", "updatedAt", nip) FROM stdin;
7e55adc6-9e81-4e22-abfe-96ae54bd5453	waka_admin	$2b$10$Jn.wqghu5boCsjlJq0mMQOZpendbldSnNaaPcv9w/zzFy.wn/z0Iu	H. Mulyadi, M.Pd. (Waka Kesiswaan)	WAKA	\N	2026-07-03 08:17:57.487	2026-07-03 08:17:57.487	197508122000031001
818b9151-c2a4-44a6-9b28-03f338539e36	bk_admin	$2b$10$2XV3Sm6u5xZp0UUNRJoYqOlcfx6bq4pAUseX9WFkhleqJLo4Cs7Hy	Budi Santoso, S.Pd. (Guru BK)	BK	\N	2026-07-03 08:17:57.503	2026-07-03 08:17:57.503	198004052005012002
87d09d9d-621d-4642-9887-5f06bbb3a6ee	walas_rpl	$2b$10$R527TahnQR1QKyfT4ciqTu2KIExUsMSt.lwm29AdHkhxaX/viXXIK	Dewi Lestari, M.Kom. (Wali Kelas)	WALAS	+6281234567890	2026-07-03 08:17:57.508	2026-07-03 08:17:57.508	198811122015042003
eebde675-5e47-43a0-ae36-714ed71d46d5	guru_piket	$2b$10$WxgwA3yhyj8WQphvey1oJeJLNtxd0TJ3sDlze0J7cA/lONWr6yzeq	Joko Susilo, S.Pd. (Guru Mapel)	GURU	\N	2026-07-03 08:17:57.512	2026-07-03 08:17:57.512	199201202020081004
\.


--
-- TOC entry 4479 (class 2606 OID 26065)
-- Name: Absensi Absensi_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Absensi"
    ADD CONSTRAINT "Absensi_pkey" PRIMARY KEY (id);


--
-- TOC entry 4489 (class 2606 OID 26196)
-- Name: AppSetting AppSetting_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AppSetting"
    ADD CONSTRAINT "AppSetting_pkey" PRIMARY KEY (id);


--
-- TOC entry 4498 (class 2606 OID 26299)
-- Name: BimbinganKonseling BimbinganKonseling_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."BimbinganKonseling"
    ADD CONSTRAINT "BimbinganKonseling_pkey" PRIMARY KEY (id);


--
-- TOC entry 4470 (class 2606 OID 26012)
-- Name: DetailPelanggaran DetailPelanggaran_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DetailPelanggaran"
    ADD CONSTRAINT "DetailPelanggaran_pkey" PRIMARY KEY (id);


--
-- TOC entry 4482 (class 2606 OID 26151)
-- Name: HariLibur HariLibur_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."HariLibur"
    ADD CONSTRAINT "HariLibur_pkey" PRIMARY KEY (id);


--
-- TOC entry 4505 (class 2606 OID 26361)
-- Name: JadwalPelajaran JadwalPelajaran_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JadwalPelajaran"
    ADD CONSTRAINT "JadwalPelajaran_pkey" PRIMARY KEY (id);


--
-- TOC entry 4503 (class 2606 OID 26345)
-- Name: JamPelajaran JamPelajaran_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JamPelajaran"
    ADD CONSTRAINT "JamPelajaran_pkey" PRIMARY KEY (id);


--
-- TOC entry 4509 (class 2606 OID 26390)
-- Name: JurnalAbsensi JurnalAbsensi_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JurnalAbsensi"
    ADD CONSTRAINT "JurnalAbsensi_pkey" PRIMARY KEY (id);


--
-- TOC entry 4507 (class 2606 OID 26379)
-- Name: JurnalMengajar JurnalMengajar_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JurnalMengajar"
    ADD CONSTRAINT "JurnalMengajar_pkey" PRIMARY KEY (id);


--
-- TOC entry 4511 (class 2606 OID 26401)
-- Name: JurnalPenilaian JurnalPenilaian_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JurnalPenilaian"
    ADD CONSTRAINT "JurnalPenilaian_pkey" PRIMARY KEY (id);


--
-- TOC entry 4468 (class 2606 OID 26001)
-- Name: KategoriPelanggaran KategoriPelanggaran_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."KategoriPelanggaran"
    ADD CONSTRAINT "KategoriPelanggaran_pkey" PRIMARY KEY (id);


--
-- TOC entry 4461 (class 2606 OID 25976)
-- Name: Kelas Kelas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Kelas"
    ADD CONSTRAINT "Kelas_pkey" PRIMARY KEY (id);


--
-- TOC entry 4472 (class 2606 OID 26027)
-- Name: LaporanPelanggaran LaporanPelanggaran_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LaporanPelanggaran"
    ADD CONSTRAINT "LaporanPelanggaran_pkey" PRIMARY KEY (id);


--
-- TOC entry 4475 (class 2606 OID 26037)
-- Name: MasterRemisi MasterRemisi_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MasterRemisi"
    ADD CONSTRAINT "MasterRemisi_pkey" PRIMARY KEY (id);


--
-- TOC entry 4501 (class 2606 OID 26331)
-- Name: MataPelajaran MataPelajaran_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MataPelajaran"
    ADD CONSTRAINT "MataPelajaran_pkey" PRIMARY KEY (id);


--
-- TOC entry 4491 (class 2606 OID 26210)
-- Name: PemanggilanSiswa PemanggilanSiswa_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PemanggilanSiswa"
    ADD CONSTRAINT "PemanggilanSiswa_pkey" PRIMARY KEY (id);


--
-- TOC entry 4494 (class 2606 OID 26248)
-- Name: PenangananSiswa PenangananSiswa_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PenangananSiswa"
    ADD CONSTRAINT "PenangananSiswa_pkey" PRIMARY KEY (id);


--
-- TOC entry 4496 (class 2606 OID 26282)
-- Name: RujukanSiswa RujukanSiswa_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RujukanSiswa"
    ADD CONSTRAINT "RujukanSiswa_pkey" PRIMARY KEY (id);


--
-- TOC entry 4485 (class 2606 OID 26170)
-- Name: SiswaKelas SiswaKelas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SiswaKelas"
    ADD CONSTRAINT "SiswaKelas_pkey" PRIMARY KEY (id);


--
-- TOC entry 4465 (class 2606 OID 25992)
-- Name: Siswa Siswa_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Siswa"
    ADD CONSTRAINT "Siswa_pkey" PRIMARY KEY (id);


--
-- TOC entry 4459 (class 2606 OID 25964)
-- Name: TahunAjaran TahunAjaran_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TahunAjaran"
    ADD CONSTRAINT "TahunAjaran_pkey" PRIMARY KEY (id);


--
-- TOC entry 4477 (class 2606 OID 26050)
-- Name: TransaksiRemisi TransaksiRemisi_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TransaksiRemisi"
    ADD CONSTRAINT "TransaksiRemisi_pkey" PRIMARY KEY (id);


--
-- TOC entry 4455 (class 2606 OID 25951)
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- TOC entry 4480 (class 1259 OID 26072)
-- Name: Absensi_siswaId_tanggal_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Absensi_siswaId_tanggal_key" ON public."Absensi" USING btree ("siswaId", tanggal);


--
-- TOC entry 4487 (class 1259 OID 26211)
-- Name: AppSetting_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "AppSetting_key_key" ON public."AppSetting" USING btree (key);


--
-- TOC entry 4483 (class 1259 OID 26152)
-- Name: HariLibur_tanggal_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "HariLibur_tanggal_key" ON public."HariLibur" USING btree (tanggal);


--
-- TOC entry 4466 (class 1259 OID 26070)
-- Name: KategoriPelanggaran_nama_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "KategoriPelanggaran_nama_key" ON public."KategoriPelanggaran" USING btree (nama);


--
-- TOC entry 4462 (class 1259 OID 26068)
-- Name: Kelas_walasId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Kelas_walasId_key" ON public."Kelas" USING btree ("walasId");


--
-- TOC entry 4473 (class 1259 OID 26071)
-- Name: MasterRemisi_nama_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "MasterRemisi_nama_key" ON public."MasterRemisi" USING btree (nama);


--
-- TOC entry 4499 (class 1259 OID 26402)
-- Name: MataPelajaran_kode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "MataPelajaran_kode_key" ON public."MataPelajaran" USING btree (kode);


--
-- TOC entry 4492 (class 1259 OID 26212)
-- Name: PemanggilanSiswa_siswaId_thresholdPoints_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "PemanggilanSiswa_siswaId_thresholdPoints_key" ON public."PemanggilanSiswa" USING btree ("siswaId", "thresholdPoints");


--
-- TOC entry 4486 (class 1259 OID 26171)
-- Name: SiswaKelas_siswaId_tahunAjaranId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "SiswaKelas_siswaId_tahunAjaranId_key" ON public."SiswaKelas" USING btree ("siswaId", "tahunAjaranId");


--
-- TOC entry 4463 (class 1259 OID 26069)
-- Name: Siswa_nis_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Siswa_nis_key" ON public."Siswa" USING btree (nis);


--
-- TOC entry 4457 (class 1259 OID 26067)
-- Name: TahunAjaran_nama_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "TahunAjaran_nama_key" ON public."TahunAjaran" USING btree (nama);


--
-- TOC entry 4453 (class 1259 OID 26139)
-- Name: User_nip_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_nip_key" ON public."User" USING btree (nip);


--
-- TOC entry 4456 (class 1259 OID 26066)
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- TOC entry 4523 (class 2606 OID 26133)
-- Name: Absensi Absensi_pencatatId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Absensi"
    ADD CONSTRAINT "Absensi_pencatatId_fkey" FOREIGN KEY ("pencatatId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4524 (class 2606 OID 26128)
-- Name: Absensi Absensi_siswaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Absensi"
    ADD CONSTRAINT "Absensi_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES public."Siswa"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4533 (class 2606 OID 26315)
-- Name: BimbinganKonseling BimbinganKonseling_pembimbingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."BimbinganKonseling"
    ADD CONSTRAINT "BimbinganKonseling_pembimbingId_fkey" FOREIGN KEY ("pembimbingId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4534 (class 2606 OID 26310)
-- Name: BimbinganKonseling BimbinganKonseling_siswaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."BimbinganKonseling"
    ADD CONSTRAINT "BimbinganKonseling_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES public."Siswa"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4515 (class 2606 OID 26088)
-- Name: DetailPelanggaran DetailPelanggaran_kategoriId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DetailPelanggaran"
    ADD CONSTRAINT "DetailPelanggaran_kategoriId_fkey" FOREIGN KEY ("kategoriId") REFERENCES public."KategoriPelanggaran"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4535 (class 2606 OID 26408)
-- Name: JadwalPelajaran JadwalPelajaran_guruId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JadwalPelajaran"
    ADD CONSTRAINT "JadwalPelajaran_guruId_fkey" FOREIGN KEY ("guruId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4536 (class 2606 OID 26403)
-- Name: JadwalPelajaran JadwalPelajaran_kelasId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JadwalPelajaran"
    ADD CONSTRAINT "JadwalPelajaran_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES public."Kelas"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4537 (class 2606 OID 26413)
-- Name: JadwalPelajaran JadwalPelajaran_mapelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JadwalPelajaran"
    ADD CONSTRAINT "JadwalPelajaran_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES public."MataPelajaran"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4542 (class 2606 OID 26438)
-- Name: JurnalAbsensi JurnalAbsensi_jurnalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JurnalAbsensi"
    ADD CONSTRAINT "JurnalAbsensi_jurnalId_fkey" FOREIGN KEY ("jurnalId") REFERENCES public."JurnalMengajar"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4543 (class 2606 OID 26443)
-- Name: JurnalAbsensi JurnalAbsensi_siswaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JurnalAbsensi"
    ADD CONSTRAINT "JurnalAbsensi_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES public."Siswa"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4538 (class 2606 OID 26428)
-- Name: JurnalMengajar JurnalMengajar_guruId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JurnalMengajar"
    ADD CONSTRAINT "JurnalMengajar_guruId_fkey" FOREIGN KEY ("guruId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4539 (class 2606 OID 26418)
-- Name: JurnalMengajar JurnalMengajar_jadwalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JurnalMengajar"
    ADD CONSTRAINT "JurnalMengajar_jadwalId_fkey" FOREIGN KEY ("jadwalId") REFERENCES public."JadwalPelajaran"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4540 (class 2606 OID 26423)
-- Name: JurnalMengajar JurnalMengajar_kelasId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JurnalMengajar"
    ADD CONSTRAINT "JurnalMengajar_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES public."Kelas"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4541 (class 2606 OID 26433)
-- Name: JurnalMengajar JurnalMengajar_mapelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JurnalMengajar"
    ADD CONSTRAINT "JurnalMengajar_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES public."MataPelajaran"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4544 (class 2606 OID 26448)
-- Name: JurnalPenilaian JurnalPenilaian_jurnalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JurnalPenilaian"
    ADD CONSTRAINT "JurnalPenilaian_jurnalId_fkey" FOREIGN KEY ("jurnalId") REFERENCES public."JurnalMengajar"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4545 (class 2606 OID 26453)
-- Name: JurnalPenilaian JurnalPenilaian_siswaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JurnalPenilaian"
    ADD CONSTRAINT "JurnalPenilaian_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES public."Siswa"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4512 (class 2606 OID 26153)
-- Name: Kelas Kelas_bkId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Kelas"
    ADD CONSTRAINT "Kelas_bkId_fkey" FOREIGN KEY ("bkId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4513 (class 2606 OID 26073)
-- Name: Kelas Kelas_tahunAjaranId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Kelas"
    ADD CONSTRAINT "Kelas_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES public."TahunAjaran"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4514 (class 2606 OID 26078)
-- Name: Kelas Kelas_walasId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Kelas"
    ADD CONSTRAINT "Kelas_walasId_fkey" FOREIGN KEY ("walasId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4516 (class 2606 OID 26108)
-- Name: LaporanPelanggaran LaporanPelanggaran_approverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LaporanPelanggaran"
    ADD CONSTRAINT "LaporanPelanggaran_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4517 (class 2606 OID 26098)
-- Name: LaporanPelanggaran LaporanPelanggaran_detailPelanggaranId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LaporanPelanggaran"
    ADD CONSTRAINT "LaporanPelanggaran_detailPelanggaranId_fkey" FOREIGN KEY ("detailPelanggaranId") REFERENCES public."DetailPelanggaran"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4518 (class 2606 OID 26103)
-- Name: LaporanPelanggaran LaporanPelanggaran_pelaporId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LaporanPelanggaran"
    ADD CONSTRAINT "LaporanPelanggaran_pelaporId_fkey" FOREIGN KEY ("pelaporId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4519 (class 2606 OID 26093)
-- Name: LaporanPelanggaran LaporanPelanggaran_siswaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LaporanPelanggaran"
    ADD CONSTRAINT "LaporanPelanggaran_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES public."Siswa"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4528 (class 2606 OID 26213)
-- Name: PemanggilanSiswa PemanggilanSiswa_siswaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PemanggilanSiswa"
    ADD CONSTRAINT "PemanggilanSiswa_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES public."Siswa"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4529 (class 2606 OID 26254)
-- Name: PenangananSiswa PenangananSiswa_petugasId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PenangananSiswa"
    ADD CONSTRAINT "PenangananSiswa_petugasId_fkey" FOREIGN KEY ("petugasId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4530 (class 2606 OID 26249)
-- Name: PenangananSiswa PenangananSiswa_siswaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PenangananSiswa"
    ADD CONSTRAINT "PenangananSiswa_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES public."Siswa"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4531 (class 2606 OID 26305)
-- Name: RujukanSiswa RujukanSiswa_pembuatId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RujukanSiswa"
    ADD CONSTRAINT "RujukanSiswa_pembuatId_fkey" FOREIGN KEY ("pembuatId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4532 (class 2606 OID 26300)
-- Name: RujukanSiswa RujukanSiswa_siswaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RujukanSiswa"
    ADD CONSTRAINT "RujukanSiswa_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES public."Siswa"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4525 (class 2606 OID 26177)
-- Name: SiswaKelas SiswaKelas_kelasId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SiswaKelas"
    ADD CONSTRAINT "SiswaKelas_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES public."Kelas"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4526 (class 2606 OID 26172)
-- Name: SiswaKelas SiswaKelas_siswaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SiswaKelas"
    ADD CONSTRAINT "SiswaKelas_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES public."Siswa"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4527 (class 2606 OID 26182)
-- Name: SiswaKelas SiswaKelas_tahunAjaranId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SiswaKelas"
    ADD CONSTRAINT "SiswaKelas_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES public."TahunAjaran"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4520 (class 2606 OID 26123)
-- Name: TransaksiRemisi TransaksiRemisi_approverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TransaksiRemisi"
    ADD CONSTRAINT "TransaksiRemisi_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4521 (class 2606 OID 26118)
-- Name: TransaksiRemisi TransaksiRemisi_masterRemisiId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TransaksiRemisi"
    ADD CONSTRAINT "TransaksiRemisi_masterRemisiId_fkey" FOREIGN KEY ("masterRemisiId") REFERENCES public."MasterRemisi"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4522 (class 2606 OID 26113)
-- Name: TransaksiRemisi TransaksiRemisi_siswaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TransaksiRemisi"
    ADD CONSTRAINT "TransaksiRemisi_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES public."Siswa"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


-- Completed on 2026-07-06 10:53:29 WIB

--
-- PostgreSQL database dump complete
--

\unrestrict fYPa8b5Krln9nJeGvBmz4dBoqUa9HkXLMJgWYw2Ob10io1pyZqYqtRgLL1QwF4P

