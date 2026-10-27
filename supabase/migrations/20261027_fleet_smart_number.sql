-- شماره هوشمند ناوگان برای رانندگان تریلی، جفت، تک و خاور/کامیونت
alter table public.driver_profiles add column if not exists fleet_smart_number text;
alter table public.driver_registration_otps add column if not exists fleet_smart_number text;
