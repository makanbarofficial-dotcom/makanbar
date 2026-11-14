-- متن خوش‌آمد جدا برای صاحب بار و راننده، و کلید جدا برای پیامک بار جدید به متصدی‌ها
insert into public.app_settings (key, value)
select 'welcome_message_customer', value from public.app_settings where key = 'welcome_message'
on conflict (key) do nothing;
insert into public.app_settings (key, value)
select 'welcome_message_driver', value from public.app_settings where key = 'welcome_message'
on conflict (key) do nothing;
insert into public.app_settings (key, value) values ('sms_new_request_staff', 'true')
on conflict (key) do nothing;
