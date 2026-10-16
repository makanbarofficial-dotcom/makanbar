"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  getCities,
  getProvincesList,
} from "@code-plate/iran-cities";
import {
  DELIVERY_MODE_LABELS,
  DIRECTION_LABELS,
  type Direction,
  SHIPMENT_TYPE_LABELS,
  type ShipmentRequest,
  type ShipmentType,
  STATUSES,
  formatPrice,
  normalizeDigits,
  regionLabel,
  statusTone,
} from "@/lib/shipments";
import { Logo } from "@/components/ui";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type RequestItem = ShipmentRequest;

type Representative = {
  id: number;
  province: string;
  city: string;
  address: string | null;
  phone: string | null;
  mobile: string | null;
  location_url: string | null;
  created_at: string;
};

type Staff = {
  id: number;
  name: string;
  phone: string;
  province: string | null;
  city: string | null;
  panel_enabled: boolean | null;
  auth_user_id: string | null;
  created_at: string;
};

type StaffLocation = {
  id: number;
  staff_id: number;
  province: string;
  city: string | null;
  created_at: string;
};

type StaffLocationForm = {
  province: string;
  city: string;
};

type AdminAccount = {
  auth_user_id: string;
  name: string | null;
  phone: string | null;
  created_at: string;
};

type DriverStatus = "pending" | "approved" | "rejected";

type Driver = {
  id: string;
  full_name: string;
  phone: string;
  status: DriverStatus;
  vehicle_type: string | null;
  vehicle_model: string | null;
  vehicle_plate: string | null;
  created_at: string;
};

const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  approved: "فعال",
  rejected: "غیرفعال",
  pending: "در انتظار تأیید",
};

type Customer = {
  id: number;
  auth_user_id: string | null;
  full_name: string | null;
  phone: string | null;
  company_name: string | null;
  address: string | null;
  created_at: string | null;
};

function formatCustomerPhone(phone?: string | null) {
  if (!phone) return "—";

  // تبدیل ارقام فارسی و عربی به انگلیسی، فقط برای نمایش
  const normalized = phone
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));

  let digits = normalized.replace(/\D/g, "");

  if (digits.startsWith("0098")) {
    digits = digits.slice(4);
  } else if (digits.startsWith("98")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length === 10 && digits.startsWith("9")) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
  }

  return phone;
}

const emptyRepresentative = {
  province: "",
  city: "",
  address: "",
  phone: "",
  mobile: "",
  location_url: "",
};

const emptyStaff = {
  name: "",
  phone: "",
  panel_enabled: false,
  password: "",
};

export default function AdminDashboardPage() {
  const router = useRouter();

  const [activeSection, setActiveSection] =
    useState("dashboard");

  const [requests, setRequests] = useState<RequestItem[]>(
    []
  );

  const [representatives, setRepresentatives] =
    useState<Representative[]>([]);

  const [staff, setStaff] = useState<Staff[]>([]);

  const [staffLocations, setStaffLocations] =
    useState<Record<number, StaffLocation[]>>({});

  const [requestSearch, setRequestSearch] =
    useState("");

  const [requestTypeFilter, setRequestTypeFilter] =
    useState<ShipmentType | "all">("all");

  const [requestDirectionFilter, setRequestDirectionFilter] =
    useState<Direction | "all">("all");

  const [priceDrafts, setPriceDrafts] =
    useState<Record<number, string>>({});

  // درخواست‌هایی که واقعاً برای رانندگان بار ساخته‌اند (نه فقط برچسب وضعیت)
  const [publishedIds, setPublishedIds] = useState<Set<number>>(
    () => new Set()
  );

  const [publishingId, setPublishingId] =
    useState<number | null>(null);

  const [accessDenied, setAccessDenied] =
    useState(false);

  const [representativeSearch, setRepresentativeSearch] =
    useState("");

  const [staffSearch, setStaffSearch] =
    useState("");

  const [customers, setCustomers] = useState<Customer[]>([]);

  const [customerSearch, setCustomerSearch] = useState("");

  const [admins, setAdmins] = useState<AdminAccount[]>([]);

  const [adminForm, setAdminForm] = useState({ name: "", phone: "", password: "" });

  const [adminSaving, setAdminSaving] = useState(false);

  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [driverLoading, setDriverLoading] = useState(false);

  const [driverFilter, setDriverFilter] =
    useState<DriverStatus>("approved");

  const [customerLoading, setCustomerLoading] = useState(false);

  const [customerError, setCustomerError] = useState("");

  const [loading, setLoading] = useState(true);

  const [requestLoading, setRequestLoading] =
    useState(false);

  const [representativeLoading, setRepresentativeLoading] =
    useState(false);

  const [staffLoading, setStaffLoading] =
    useState(false);

  const [error, setError] = useState("");

  const [
    editingRepresentativeId,
    setEditingRepresentativeId,
  ] = useState<number | null>(null);

  const [editingStaffId, setEditingStaffId] =
    useState<number | null>(null);

  const [representativeForm, setRepresentativeForm] =
    useState(emptyRepresentative);

  const [staffForm, setStaffForm] =
    useState(emptyStaff);

  const [staffLocationForms, setStaffLocationForms] =
    useState<StaffLocationForm[]>([]);

  const provinces = useMemo(() => {
    return getProvincesList();
  }, []);

  const representativeCities = useMemo(() => {
    if (!representativeForm.province) {
      return [];
    }

    return getCities(
      representativeForm.province
    );
  }, [representativeForm.province]);

  function getProvinceFa(
    value: string | null
  ) {
    if (!value) {
      return "";
    }

    const found = provinces.find(
      (province) =>
        province.en === value ||
        province.fa === value
    );

    return found?.fa || value;
  }

  function getCityFa(
    provinceValue: string | null,
    cityValue: string | null
  ) {
    if (!cityValue) {
      return "";
    }

    if (cityValue === "*") {
      return "کل استان";
    }

    if (!provinceValue) {
      return cityValue;
    }

    const cities = getCities(
      provinceValue
    );

    const found = cities.find(
      (city) =>
        city.en === cityValue ||
        city.fa === cityValue
    );

    return found?.fa || cityValue;
  }

  const filteredRequests = useMemo(() => {
    const query =
      requestSearch.trim().toLowerCase();

    const scoped = requests.filter(
      (item) =>
        (requestTypeFilter === "all" ||
          item.shipment_type === requestTypeFilter) &&
        (requestDirectionFilter === "all" ||
          item.direction === requestDirectionFilter)
    );

    if (!query) {
      return scoped;
    }

    return scoped.filter((item) =>
      [
        item.full_name,
        item.phone,
        item.origin,
        item.destination,
        item.cargo_type,
        item.vehicle_type,
        item.status,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(query)
        )
    );
  }, [
    requests,
    requestSearch,
    requestTypeFilter,
    requestDirectionFilter,
  ]);

  // متصدیانی که خرده‌بار «تهران ← این شهر» را در پنل خود می‌بینند
  function responsibleStaff(item: RequestItem) {
    if (
      item.shipment_type !== "partial" ||
      item.direction !== "from_tehran"
    ) {
      return [];
    }

    return staff.filter(
      (member) =>
        member.panel_enabled &&
        (staffLocations[member.id] || []).some(
          (location) =>
            location.province === item.city_province &&
            (!location.city ||
              location.city === "*" ||
              location.city === item.city)
        )
    );
  }

  const filteredRepresentatives =
    useMemo(() => {
      const query =
        representativeSearch
          .trim()
          .toLowerCase();

      if (!query) {
        return representatives;
      }

      return representatives.filter((item) =>
        [
          item.province,
          item.city,
          getProvinceFa(item.province),
          getCityFa(
            item.province,
            item.city
          ),
          item.address,
          item.phone,
          item.mobile,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(query)
          )
      );
    }, [
      representatives,
      representativeSearch,
      provinces,
    ]);

  const filteredStaff = useMemo(() => {
    const query =
      staffSearch.trim().toLowerCase();

    if (!query) {
      return staff;
    }

    return staff.filter((item) => {
      const locations =
        staffLocations[item.id] || [];

      const locationText = locations
        .map(
          (location) =>
            `${getProvinceFa(
              location.province
            )} ${getCityFa(
              location.province,
              location.city
            )}`
        )
        .join(" ");

      return [
        item.name,
        item.phone,
        getProvinceFa(item.province),
        getCityFa(
          item.province,
          item.city
        ),
        locationText,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(query)
        );
    });
  }, [
    staff,
    staffSearch,
    staffLocations,
    provinces,
  ]);

  async function loadRequests() {
    const [{ data, error }, { data: loadRows }] = await Promise.all([
      supabase
        .from("requests")
        .select("*")
        .order("created_at", {
          ascending: false,
        }),
      supabase
        .from("loads")
        .select("request_id")
        .not("request_id", "is", null),
    ]);

    setPublishedIds(
      new Set(
        (loadRows || []).map(
          (row) => row.request_id as number
        )
      )
    );

    if (error) {
      console.error(error);
      setError(
        "خطا در دریافت درخواست‌ها"
      );
      return;
    }

    setRequests(data || []);
  }

  async function loadRepresentatives() {
    const { data, error } = await supabase
      .from("representatives")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      setError(
        "خطا در دریافت نمایندگان"
      );
      return;
    }

    setRepresentatives(data || []);
  }

  async function loadStaff() {
    const { data, error } = await supabase
      .from("staff")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      setError(
        "خطا در دریافت متصدیان"
      );
      return;
    }

    setStaff(data || []);
  }

  async function loadStaffLocations() {
    const { data, error } = await supabase
      .from("staff_locations")
      .select("*")
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error(error);
      setError(
        "خطا در دریافت محدوده‌های متصدیان"
      );
      return;
    }

    const grouped: Record<
      number,
      StaffLocation[]
    > = {};

    (data || []).forEach((item) => {
      if (!grouped[item.staff_id]) {
        grouped[item.staff_id] = [];
      }

      grouped[item.staff_id].push(item);
    });

    setStaffLocations(grouped);
  }

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLocaleLowerCase("fa-IR");

    if (!query) return customers;

    return customers.filter((customer) =>
      [
        customer.full_name,
        customer.phone,
        customer.company_name,
        customer.address,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLocaleLowerCase("fa-IR").includes(query)
        )
    );
  }, [customers, customerSearch]);

  async function loadAdmins() {
    const { data, error } = await supabase
      .from("app_admins")
      .select("auth_user_id, name, phone, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      setError("خطا در دریافت مدیران");
      return;
    }

    setAdmins((data || []) as AdminAccount[]);
  }

  async function createAdmin() {
    if (!adminForm.name.trim() || !adminForm.phone.trim() || adminForm.password.length < 8) {
      alert("نام، شماره موبایل و رمز حداقل ۸ کاراکتری را وارد کنید.");
      return;
    }

    setAdminSaving(true);

    const { data, error } = await supabase.functions.invoke("create-admin-user", {
      body: adminForm,
    });

    setAdminSaving(false);

    if (error || !data?.success) {
      // پیام فارسی تابع داخل بدنه‌ی پاسخ خطاست
      let message = data?.error || "";
      try {
        const payload = await (error as { context?: Response } | null)?.context?.json();
        message = payload?.error || message;
      } catch {
        // بدنه قابل خواندن نبود
      }
      alert(message || "ساخت حساب مدیر انجام نشد.");
      return;
    }

    alert(
      `حساب مدیر ساخته شد.
ورود: makanbar.com/admin با شماره ${adminForm.phone} و همین رمز.`
    );
    setAdminForm({ name: "", phone: "", password: "" });
    await loadAdmins();
  }

  async function loadDrivers() {
    setDriverLoading(true);

    const { data, error } = await supabase
      .from("driver_profiles")
      .select("id, full_name, phone, status, vehicle_type, vehicle_model, vehicle_plate, created_at")
      .order("created_at", { ascending: false });

    setDriverLoading(false);

    if (error) {
      console.error(error);
      setError("خطا در دریافت رانندگان");
      return;
    }

    setDrivers((data || []) as Driver[]);
  }

  async function setDriverStatus(driver: Driver, status: DriverStatus) {
    if (
      status === "rejected" &&
      !confirm(`${driver.full_name} غیرفعال شود؟ دیگر بار جدید نمی‌بیند.`)
    ) {
      return;
    }

    setDriverLoading(true);

    const { data, error } = await supabase
      .from("driver_profiles")
      .update({ status })
      .eq("id", driver.id)
      .select("id")
      .maybeSingle();

    setDriverLoading(false);

    if (error || !data) {
      console.error(error);
      alert("تغییر وضعیت راننده انجام نشد.");
      return;
    }

    setDrivers((current) =>
      current.map((item) => (item.id === driver.id ? { ...item, status } : item))
    );
  }

  async function loadCustomers() {
    setCustomerLoading(true);
    setCustomerError("");

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        "admin-list-customers"
      );

      if (functionError) {
        throw new Error(functionError.message || "دریافت مشتریان ناموفق بود.");
      }

      if (data?.error) {
        throw new Error(String(data.error));
      }

      const rows = Array.isArray(data) ? data : data?.customers;
      if (!Array.isArray(rows)) {
        throw new Error(
          "پاسخ تابع admin-list-customers معتبر نیست."
        );
      }

      setCustomers(rows as Customer[]);
    } catch (loadError) {
      console.error("Load customers error:", loadError);
      setCustomerError(
        loadError instanceof Error
          ? loadError.message
          : "بارگذاری مشتریان انجام نشد. تابع امن admin-list-customers را در Supabase بررسی کنید."
      );
    } finally {
      setCustomerLoading(false);
    }
  }

  useEffect(() => {
    if (activeSection === "customers") {
      void loadCustomers();
    }

    if (activeSection === "drivers") {
      void loadDrivers();
    }

    if (activeSection === "admins") {
      void loadAdmins();
    }
  }, [activeSection]);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);

      const { data: sessionData } =
        await supabase.auth.getSession();

      if (!sessionData.session) {
        router.replace("/admin");
        return;
      }

      const { data: isAdmin, error: adminError } =
        await supabase.rpc("is_admin");

      if (adminError || !isAdmin) {
        console.error("Admin check error:", adminError);
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      await Promise.all([
        loadRequests(),
        loadRepresentatives(),
        loadStaff(),
        loadStaffLocations(),
      ]);

      setLoading(false);
    }

    loadAll();
  }, []);

  function parsePriceDraft(item: RequestItem) {
    const raw = priceDrafts[item.id];

    if (raw === undefined) {
      return item.price;
    }

    const digits = normalizeDigits(raw).replace(/[^\d]/g, "");

    return digits ? Number(digits) : null;
  }

  async function savePrice(item: RequestItem) {
    const price = parsePriceDraft(item);

    if (!confirm(`کرایه این بار ذخیره شود؟
${formatPrice(price)}`)) {
      return;
    }

    setRequestLoading(true);

    const { error } = await supabase
      .from("requests")
      .update({ price })
      .eq("id", item.id);

    if (error) {
      setRequestLoading(false);
      console.error(error);
      alert(`ذخیره کرایه انجام نشد: ${error.message}`);
      return;
    }

    // اگر بار قبلاً برای رانندگان ارسال شده، کرایه‌ی پنل رانندگان هم به‌روز شود
    if (publishedIds.has(item.id)) {
      const { data: updatedLoads } = await supabase
        .from("loads")
        .update({ price })
        .eq("request_id", item.id)
        .eq("status", "available")
        .select("id");

      if (!updatedLoads?.length) {
        alert(
          "کرایه برای صاحب بار ذخیره شد، اما راننده این بار را قبلاً پذیرفته است؛ کرایه‌ی جدید را با راننده هماهنگ کنید."
        );
      }
    }

    setRequestLoading(false);

    setRequests((current) =>
      current.map((row) =>
        row.id === item.id ? { ...row, price } : row
      )
    );
  }

  // بار دربستی بعد از تأیید مدیر در «بارهای آزاد» پنل رانندگان قرار می‌گیرد
  async function publishToDrivers(item: RequestItem) {
    const price = parsePriceDraft(item);

    if (
      !confirm(
        `این بار دربستی برای رانندگان ارسال شود؟\nکرایه: ${formatPrice(price)}`
      )
    ) {
      return;
    }

    setPublishingId(item.id);

    try {
      const { error: loadError } = await supabase
        .from("loads")
        .insert({
          request_id: item.id,
          origin: item.origin,
          destination: item.destination,
          cargo_type: item.cargo_type,
          weight: item.weight || null,
          vehicle_type: item.vehicle_type || null,
          price,
          status: "available",
          driver_id: null,
          description: item.description || null,
        });

      // 23505 یعنی بار این درخواست قبلاً ساخته شده؛ فقط وضعیت را هماهنگ می‌کنیم
      if (loadError && loadError.code !== "23505") {
        throw loadError;
      }

      setPublishedIds(
        (current) => new Set(current).add(item.id)
      );

      const status = "ارسال به رانندگان";

      const { error: requestError } = await supabase
        .from("requests")
        .update({ status, price })
        .eq("id", item.id);

      if (requestError) throw requestError;

      setRequests((current) =>
        current.map((row) =>
          row.id === item.id ? { ...row, status, price } : row
        )
      );
    } catch (publishError) {
      console.error("Publish load error:", publishError);
      alert(
        `ارسال برای رانندگان انجام نشد: ${
          (publishError as { message?: string })?.message ||
          "خطای نامشخص"
        }`
      );
    } finally {
      setPublishingId(null);
    }
  }

  async function updateStatus(
    id: number,
    status: string
  ) {
    setRequestLoading(true);

    const { error } = await supabase
      .from("requests")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("تغییر وضعیت انجام نشد.");
      setRequestLoading(false);
      return;
    }

    setRequests((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
            }
          : item
      )
    );

    setRequestLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/admin");
  }

  function resetRepresentativeForm() {
    setRepresentativeForm(
      emptyRepresentative
    );

    setEditingRepresentativeId(null);
  }

  function editRepresentative(
    item: Representative
  ) {
    setEditingRepresentativeId(
      item.id
    );

    setRepresentativeForm({
      province: item.province || "",
      city: item.city || "",
      address: item.address || "",
      phone: item.phone || "",
      mobile: item.mobile || "",
      location_url:
        item.location_url || "",
    });

    setActiveSection(
      "representatives"
    );
  }

  async function saveRepresentative() {
    if (
      !representativeForm.province ||
      !representativeForm.city
    ) {
      alert(
        "لطفاً استان و شهر را انتخاب کنید."
      );
      return;
    }

    setRepresentativeLoading(true);

    try {
      if (editingRepresentativeId) {
        const { data, error } =
          await supabase
            .from("representatives")
            .update({
              province:
                representativeForm.province,
              city:
                representativeForm.city,
              address:
                representativeForm.address ||
                null,
              phone:
                representativeForm.phone ||
                null,
              mobile:
                representativeForm.mobile ||
                null,
              location_url:
                representativeForm.location_url ||
                null,
            })
            .eq(
              "id",
              editingRepresentativeId
            )
            .select()
            .single();

        if (error) {
          console.error(error);

          alert(
            `ویرایش نماینده انجام نشد: ${error.message}`
          );

          return;
        }

        setRepresentatives(
          (current) =>
            current.map((item) =>
              item.id ===
              editingRepresentativeId
                ? data
                : item
            )
        );

        alert(
          "اطلاعات نماینده ویرایش شد."
        );
      } else {
        const { data, error } =
          await supabase
            .from("representatives")
            .insert({
              province:
                representativeForm.province,
              city:
                representativeForm.city,
              address:
                representativeForm.address ||
                null,
              phone:
                representativeForm.phone ||
                null,
              mobile:
                representativeForm.mobile ||
                null,
              location_url:
                representativeForm.location_url ||
                null,
            })
            .select()
            .single();

        if (error) {
          console.error(error);

          alert(
            `ثبت نماینده انجام نشد: ${error.message}`
          );

          return;
        }

        setRepresentatives(
          (current) => [
            data,
            ...current,
          ]
        );

        alert(
          "نماینده با موفقیت ثبت شد."
        );
      }

      resetRepresentativeForm();
    } finally {
      setRepresentativeLoading(false);
    }
  }

  async function deleteRepresentative(
    id: number
  ) {
    const confirmed =
      window.confirm(
        "آیا از حذف این نماینده مطمئن هستید؟"
      );

    if (!confirmed) {
      return;
    }

    const { error } =
      await supabase
        .from("representatives")
        .delete()
        .eq("id", id);

    if (error) {
      console.error(error);
      alert(
        `حذف نماینده انجام نشد: ${error.message}`
      );
      return;
    }

    setRepresentatives(
      (current) =>
        current.filter(
          (item) => item.id !== id
        )
    );

    if (
      editingRepresentativeId === id
    ) {
      resetRepresentativeForm();
    }

    alert("نماینده حذف شد.");
  }

  function resetStaffForm() {
    setStaffForm(emptyStaff);
    setStaffLocationForms([]);
    setEditingStaffId(null);
  }

  function editStaff(item: Staff) {
    const locations =
      staffLocations[item.id] || [];

    setEditingStaffId(item.id);

    setStaffForm({
      name: item.name || "",
      phone: item.phone || "",
      panel_enabled:
        item.panel_enabled ?? false,
      password: "",
    });

    setStaffLocationForms(
      locations.map(
        (location) => ({
          province:
            location.province,
          city:
            location.city || "*",
        })
      )
    );

    setActiveSection("staff");
  }

  function addStaffLocationForm() {
    setStaffLocationForms(
      (current) => [
        ...current,
        {
          province: "",
          city: "*",
        },
      ]
    );
  }

  function removeStaffLocationForm(
    index: number
  ) {
    setStaffLocationForms(
      (current) =>
        current.filter(
          (_, i) => i !== index
        )
    );
  }

  function updateStaffLocationForm(
    index: number,
    field: keyof StaffLocationForm,
    value: string
  ) {
    setStaffLocationForms(
      (current) =>
        current.map((item, i) => {
          if (i !== index) {
            return item;
          }

          if (
            field === "province"
          ) {
            return {
              ...item,
              province: value,
              city: "*",
            };
          }

          return {
            ...item,
            [field]: value,
          };
        })
    );
  }

  async function syncStaffLocations(
    staffId: number
  ) {
    const {
      error: deleteError,
    } = await supabase
      .from("staff_locations")
      .delete()
      .eq("staff_id", staffId);

    if (deleteError) {
      console.error(
        "Delete locations error:",
        deleteError
      );

      throw deleteError;
    }

    const validLocations =
      staffLocationForms.filter(
        (item) =>
          item.province
      );

    if (
      validLocations.length === 0
    ) {
      throw new Error(
        "حداقل یک محدوده فعالیت لازم است."
      );
    }

    const rows =
      validLocations.map(
        (item) => ({
          staff_id: staffId,
          province:
            item.province,
          city:
            item.city &&
            item.city !== "*"
              ? item.city
              : null,
        })
      );

    console.log(
      "Saving staff locations:",
      rows
    );

    const {
      data,
      error: insertError,
    } = await supabase
      .from("staff_locations")
      .insert(rows)
      .select();

    if (insertError) {
      console.error(
        "Insert locations error:",
        insertError
      );

      throw insertError;
    }

    console.log(
      "Saved staff locations:",
      data
    );
  }

  async function saveStaff() {
    if (
      !staffForm.name.trim() ||
      !staffForm.phone.trim()
    ) {
      alert(
        "لطفاً نام و شماره موبایل متصدی را وارد کنید."
      );

      return;
    }

    const validLocations =
      staffLocationForms.filter(
        (item) =>
          item.province
      );

    if (
      validLocations.length === 0
    ) {
      alert(
        "لطفاً حداقل یک محدوده فعالیت برای متصدی انتخاب کنید."
      );

      return;
    }

    if (
      staffForm.panel_enabled &&
      !editingStaffId &&
      !staffForm.password
    ) {
      alert(
        "برای فعال کردن پنل، رمز عبور را وارد کنید."
      );

      return;
    }

    setStaffLoading(true);

    try {
      // ==========================================
      // ویرایش متصدی
      // ==========================================
      if (editingStaffId) {
        const existingStaff =
          staff.find(
            (item) =>
              item.id ===
              editingStaffId
          );

        const {
          data,
          error,
        } = await supabase
          .from("staff")
          .update({
            name:
              staffForm.name.trim(),
            phone:
              staffForm.phone.trim(),
            panel_enabled:
              staffForm.panel_enabled,
          })
          .eq(
            "id",
            editingStaffId
          )
          .select()
          .single();

        if (error) {
          console.error(
            "Staff update error:",
            error
          );

          alert(
            `ویرایش متصدی انجام نشد: ${error.message}`
          );

          return;
        }

        setStaff(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                editingStaffId
                  ? data
                  : item
            )
        );

        // اگر پنل فعال شده ولی حساب ندارد
        if (
          staffForm.panel_enabled &&
          !existingStaff?.auth_user_id
        ) {
          if (
            !staffForm.password
          ) {
            alert(
              "برای ساخت حساب پنل، رمز عبور را وارد کنید."
            );

            return;
          }

          const {
            data:
              functionData,
            error:
              functionError,
          } =
            await supabase.functions.invoke(
              "create-staff-user",
              {
                body: {
                  staff_id:
                    editingStaffId,
                  phone:
                    staffForm.phone.trim(),
                  password:
                    staffForm.password,
                },
              }
            );

          if (functionError) {
            console.error(
              "Create staff user error:",
              functionError
            );

            alert(
              `اطلاعات متصدی ذخیره شد، اما حساب پنل ساخته نشد: ${functionError.message}`
            );

            return;
          }

          if (
            functionData?.error
          ) {
            alert(
              functionData.error
            );

            return;
          }

          await loadStaff();
        }

        // ذخیره محدوده‌های جدید
        await syncStaffLocations(
          editingStaffId
        );

        await loadStaffLocations();

        alert(
          "اطلاعات متصدی و محدوده فعالیت با موفقیت ذخیره شد."
        );

        resetStaffForm();

        return;
      }

      // ==========================================
      // ثبت متصدی جدید
      // ==========================================
      const {
        data,
        error,
      } = await supabase
        .from("staff")
        .insert({
          name:
            staffForm.name.trim(),
          phone:
            staffForm.phone.trim(),
          panel_enabled:
            staffForm.panel_enabled,
        })
        .select()
        .single();

      if (error) {
        console.error(
          "Staff insert error:",
          error
        );

        alert(
          `ثبت متصدی انجام نشد: ${error.message}`
        );

        return;
      }

      // ساخت حساب پنل
      if (
        staffForm.panel_enabled
      ) {
        const {
          data:
            functionData,
          error:
            functionError,
        } =
          await supabase.functions.invoke(
            "create-staff-user",
            {
              body: {
                staff_id:
                  data.id,
                phone:
                  staffForm.phone.trim(),
                password:
                  staffForm.password,
              },
            }
          );

        if (functionError) {
          console.error(
            "Create staff user error:",
            functionError
          );

          alert(
            `متصدی ثبت شد، اما حساب پنل ساخته نشد: ${functionError.message}`
          );

          return;
        }

        if (
          functionData?.error
        ) {
          alert(
            functionData.error
          );

          return;
        }
      }

      // ثبت محدوده‌ها
      await syncStaffLocations(
        data.id
      );

      await Promise.all([
        loadStaff(),
        loadStaffLocations(),
      ]);

      alert(
        "متصدی، حساب پنل و محدوده فعالیت با موفقیت ثبت شدند."
      );

      resetStaffForm();
    } catch (error) {
      console.error(
        "Save staff error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "خطایی هنگام ذخیره اطلاعات متصدی رخ داد."
      );
    } finally {
      setStaffLoading(false);
    }
  }

  async function deleteStaff(
    id: number
  ) {
    const item =
      staff.find(
        (staffItem) =>
          staffItem.id === id
      );

    const confirmed =
      window.confirm(
        item?.auth_user_id
          ? "این متصدی حساب پنل دارد. با تأیید، هم اطلاعات متصدی و هم حساب ورود پنل او به‌طور کامل حذف می‌شود. ادامه می‌دهید؟"
          : "آیا از حذف این متصدی مطمئن هستید؟"
      );

    if (!confirmed) {
      return;
    }

    try {
      setStaffLoading(true);

      const {
        data,
        error: functionError,
      } =
        await supabase.functions.invoke(
          "delete-staff-user",
          {
            body: {
              staff_id: id,
            },
          }
        );

      if (functionError) {
        console.error(
          "Delete staff function error:",
          functionError
        );

        alert(
          `حذف متصدی انجام نشد: ${functionError.message}`
        );

        return;
      }

      if (data?.error) {
        console.error(
          "Delete staff error:",
          data.error
        );

        alert(data.error);

        return;
      }

      setStaff(
        (current) =>
          current.filter(
            (item) =>
              item.id !== id
          )
      );

      setStaffLocations(
        (current) => {
          const next = {
            ...current,
          };

          delete next[id];

          return next;
        }
      );

      if (
        editingStaffId === id
      ) {
        resetStaffForm();
      }

      alert(
        "متصدی و حساب پنل او با موفقیت حذف شدند."
      );
    } catch (error) {
      console.error(error);

      alert(
        "یک خطای غیرمنتظره هنگام حذف متصدی رخ داد."
      );
    } finally {
      setStaffLoading(false);
    }
  }

  function formatDate(
    date: string
  ) {
    return new Date(
      date
    ).toLocaleDateString(
      "fa-IR",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );
  }

  const menuItems = [
    {
      id: "dashboard",
      label: "داشبورد",
      icon: "🏠",
    },
    {
      id: "requests",
      label: "درخواست‌های حمل",
      icon: "📦",
    },
    {
      id: "representatives",
      label: "نمایندگان",
      icon: "📍",
    },
    {
      id: "staff",
      label: "متصدیان",
      icon: "👤",
    },
    {
      id: "customers",
      label: "مشتریان",
      icon: "👥",
    },
    {
      id: "drivers",
      label: "رانندگان",
      icon: "🚚",
    },
    {
      id: "admins",
      label: "مدیران",
      icon: "🛡️",
    },
    {
      id: "fleet",
      label: "ناوگان",
      icon: "🚛",
    },
    {
      id: "services",
      label: "خدمات",
      icon: "🛠️",
    },
    {
      id: "reports",
      label: "گزارش‌ها",
      icon: "📊",
    },
    {
      id: "settings",
      label: "تنظیمات",
      icon: "⚙️",
    },
  ];

  if (accessDenied) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-ink px-5 text-white"
      >
        <div className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-xl font-black">
            دسترسی مدیریت ندارید
          </p>
          <p className="mt-3 text-sm leading-7 text-white/60">
            این حساب در فهرست مدیران (جدول app_admins) ثبت نشده است.
          </p>
          <button
            type="button"
            onClick={logout}
            className="mt-6 rounded-2xl bg-orange-500 px-5 py-3 font-bold"
          >
            خروج
          </button>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-ink text-white"
      >
        <div className="text-center">
          <div className="mb-4 text-5xl">
            🚛
          </div>

          <p className="font-bold">
            در حال بارگذاری داشبورد...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-ink text-white"
    >
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-72 shrink-0 border-l border-white/10 bg-ink-2 p-5 lg:block">
          <div className="mb-8 flex items-center gap-3">
            <Logo />

            <div>
              <h1 className="text-lg font-black">
                ماکان بار
              </h1>

              <p className="text-xs text-white/50">
                پنل مدیریت
              </p>
            </div>
          </div>

          <nav className="space-y-2">
            {menuItems.map(
              (item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setActiveSection(
                      item.id
                    )
                  }
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-right font-bold transition ${
                    activeSection ===
                    item.id
                      ? "bg-orange-500 text-white"
                      : "text-white/65 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="text-xl">
                    {item.icon}
                  </span>

                  <span>
                    {item.label}
                  </span>
                </button>
              )
            )}
          </nav>

          <button
            type="button"
            onClick={logout}
            className="mt-8 flex w-full items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 font-bold text-red-300 transition hover:bg-red-500/20"
          >
            🚪 خروج
          </button>
        </aside>

        <section className="min-w-0 flex-1 p-5 md:p-8">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="mb-1 text-sm text-orange-400">
                مدیریت ماکان بار
              </p>

              <h2 className="text-2xl font-black md:text-3xl">
                {menuItems.find(
                  (item) =>
                    item.id ===
                    activeSection
                )?.label ||
                  "داشبورد"}
              </h2>
            </div>

            <button
              type="button"
              onClick={logout}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold transition hover:bg-white/10 lg:hidden"
            >
              خروج
            </button>
          </div>

          <nav
            aria-label="بخش‌های مدیریت"
            className="-mx-5 mb-6 flex gap-2 overflow-x-auto px-5 pb-1 lg:hidden"
          >
            {menuItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                  activeSection === item.id
                    ? "bg-orange-500 text-white"
                    : "bg-white/5 text-white/70"
                }`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </nav>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm font-bold text-red-300">
              {error}
            </div>
          )}

          {activeSection ===
            "dashboard" && (
            <section>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <p className="text-sm text-white/50">
                    کل درخواست‌ها
                  </p>

                  <p className="mt-3 text-4xl font-black text-orange-400">
                    {requests.length}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <p className="text-sm text-white/50">
                    درخواست‌های جدید
                  </p>

                  <p className="mt-3 text-4xl font-black">
                    {
                      requests.filter(
                        (item) =>
                          !item.status ||
                          item.status ===
                            "جدید"
                      ).length
                    }
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <p className="text-sm text-white/50">
                    نمایندگان
                  </p>

                  <p className="mt-3 text-4xl font-black">
                    {
                      representatives.length
                    }
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <p className="text-sm text-white/50">
                    متصدیان
                  </p>

                  <p className="mt-3 text-4xl font-black">
                    {staff.length}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <h3 className="text-xl font-black">
                    آخرین درخواست‌ها
                  </h3>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveSection(
                        "requests"
                      )
                    }
                    className="text-sm font-bold text-orange-400"
                  >
                    مشاهده همه
                  </button>
                </div>

                <div className="space-y-3">
                  {requests
                    .slice(0, 5)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-white/10 bg-black/10 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-black">
                              {
                                item.full_name
                              }
                            </p>

                            <p className="mt-1 text-sm text-white/50">
                              {
                                item.origin
                              }{" "}
                              ←{" "}
                              {
                                item.destination
                              }
                            </p>
                          </div>

                          <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-300">
                            {item.status ||
                              "جدید"}
                          </span>
                        </div>
                      </div>
                    ))}

                  {requests.length ===
                    0 && (
                    <p className="py-8 text-center text-white/40">
                      هنوز درخواستی ثبت نشده است.
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeSection ===
            "requests" && (
            <section>
              <div className="mb-5 flex flex-wrap gap-2">
                {(
                  [
                    ["all", "همه بارها"],
                    ["full", "دربستی"],
                    ["partial", "خرده‌بار"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setRequestTypeFilter(id)}
                    className={`rounded-2xl px-5 py-3 text-sm font-bold transition ${
                      requestTypeFilter === id
                        ? "bg-orange-500 text-white"
                        : "bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    {label}
                    <span className="mr-2 text-xs opacity-70">
                      {(id === "all"
                        ? requests.length
                        : requests.filter(
                            (item) => item.shipment_type === id
                          ).length
                      ).toLocaleString("fa-IR")}
                    </span>
                  </button>
                ))}

                <select
                  value={requestDirectionFilter}
                  onChange={(e) =>
                    setRequestDirectionFilter(
                      e.target.value as Direction | "all"
                    )
                  }
                  className="rounded-2xl border border-white/10 bg-ink-2 px-4 py-3 text-sm outline-none"
                >
                  <option value="all">همه مسیرها</option>
                  <option value="from_tehran">
                    {DIRECTION_LABELS.from_tehran}
                  </option>
                  <option value="to_tehran">
                    {DIRECTION_LABELS.to_tehran}
                  </option>
                  <option value="between_cities">
                    {DIRECTION_LABELS.between_cities}
                  </option>
                </select>
              </div>

              <div className="mb-5">
                <input
                  value={requestSearch}
                  onChange={(e) =>
                    setRequestSearch(e.target.value)
                  }
                  placeholder="جستجو در بارها..."
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 outline-none placeholder:text-white/30 focus:border-orange-500"
                />
              </div>

              <div className="space-y-4">
                {filteredRequests.map((item) => {
                  const assignees = responsibleStaff(item);
                  const isFull = item.shipment_type === "full";
                  const published = publishedIds.has(item.id);

                  return (
                    <div
                      key={item.id}
                      className="rounded-3xl border border-white/10 bg-white/5 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${
                                isFull
                                  ? "bg-orange-500/15 text-orange-300"
                                  : item.shipment_type === "partial"
                                    ? "bg-sky-500/15 text-sky-300"
                                    : "bg-white/10 text-white/60"
                              }`}
                            >
                              {item.shipment_type
                                ? SHIPMENT_TYPE_LABELS[item.shipment_type]
                                : "نوع نامشخص"}
                            </span>

                            {item.direction && (
                              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/70">
                                {DIRECTION_LABELS[item.direction]}
                              </span>
                            )}

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone(item.status)}`}
                            >
                              {item.status || "جدید"}
                            </span>
                          </div>

                          <h3 className="mt-3 text-lg font-black">
                            {item.origin} ← {item.destination}
                          </h3>

                          <p className="mt-1 text-sm text-white/50">
                            {item.full_name} ·{" "}
                            <a
                              href={`tel:${item.phone}`}
                              dir="ltr"
                              className="text-orange-300"
                            >
                              {item.phone}
                            </a>
                          </p>
                        </div>

                        <select
                          value={item.status || "جدید"}
                          disabled={requestLoading}
                          onChange={(e) =>
                            isFull &&
                            !published &&
                            e.target.value === "ارسال به رانندگان"
                              ? void publishToDrivers(item)
                              : updateStatus(item.id, e.target.value)
                          }
                          className="rounded-xl border border-white/10 bg-ink-2 px-4 py-2 text-sm outline-none"
                        >
                          {STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-2xl bg-black/10 p-4">
                          <p className="text-xs text-white/40">نوع بار</p>
                          <p className="mt-1 font-bold">{item.cargo_type}</p>
                        </div>

                        <div className="rounded-2xl bg-black/10 p-4">
                          <p className="text-xs text-white/40">تعداد / وزن</p>
                          <p className="mt-1 font-bold">
                            {[item.quantity, item.weight].filter(Boolean).join(" · ") || "—"}
                          </p>
                          {item.dimensions && (
                            <p className="mt-1 text-xs text-white/55">
                              ابعاد: {item.dimensions}
                            </p>
                          )}
                        </div>

                        <div className="rounded-2xl bg-black/10 p-4">
                          <p className="text-xs text-white/40">
                            {isFull ? "خودرو" : "روش تحویل"}
                          </p>
                          <p className="mt-1 font-bold">
                            {isFull
                              ? item.vehicle_type || "فرقی ندارد"
                              : item.delivery_mode
                                ? DELIVERY_MODE_LABELS[item.delivery_mode]
                                : "—"}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-black/10 p-4">
                          <p className="text-xs text-white/40">تاریخ</p>
                          <p className="mt-1 font-bold">
                            {formatDate(item.created_at)}
                          </p>
                        </div>
                      </div>

                      {(item.pickup_address ||
                        item.delivery_address ||
                        item.description) && (
                        <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                          {item.pickup_address && (
                            <div className="rounded-2xl bg-black/10 p-4">
                              <p className="text-xs text-white/40">آدرس بارگیری</p>
                              <p className="mt-1 leading-7 text-white/75">
                                {item.pickup_address}
                              </p>
                            </div>
                          )}
                          {item.delivery_address && (
                            <div className="rounded-2xl bg-black/10 p-4">
                              <p className="text-xs text-white/40">آدرس تخلیه</p>
                              <p className="mt-1 leading-7 text-white/75">
                                {item.delivery_address}
                              </p>
                            </div>
                          )}
                          {item.description && (
                            <div className="rounded-2xl bg-black/10 p-4">
                              <p className="text-xs text-white/40">توضیحات</p>
                              <p className="mt-1 leading-7 text-white/75">
                                {item.description}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {item.shipment_type === "partial" && (
                        <div className="mt-3 rounded-2xl bg-black/10 p-4 text-sm">
                          <p className="text-xs text-white/40">متصدی مسئول</p>
                          {item.direction !== "from_tehran" ? (
                            <p className="mt-1 text-white/75">
                              {item.direction ? DIRECTION_LABELS[item.direction] : "مسیر نامشخص"} · فقط مدیریت
                            </p>
                          ) : assignees.length > 0 ? (
                            <p className="mt-1 font-bold text-sky-300">
                              {assignees
                                .map((member) => member.name)
                                .join("، ")}
                            </p>
                          ) : (
                            <p className="mt-1 font-bold text-red-300">
                              برای{" "}
                              {regionLabel(item.city_province, item.city)}{" "}
                              متصدی فعالی تعیین نشده است.
                            </p>
                          )}
                          {item.staff_note && (
                            <p className="mt-2 text-white/60">
                              یادداشت متصدی: {item.staff_note}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <input
                          value={
                            priceDrafts[item.id] ??
                            (item.price != null ? String(item.price) : "")
                          }
                          onChange={(e) =>
                            setPriceDrafts((current) => ({
                              ...current,
                              [item.id]: e.target.value,
                            }))
                          }
                          inputMode="numeric"
                          placeholder="کرایه (تومان)"
                          className="w-48 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none placeholder:text-white/30 focus:border-orange-500"
                        />

                        {/* مبلغ خوانا کنار کادر تا صفر اضافه یا کم دیده شود */}
                        <span className="text-xs font-bold text-emerald-300">
                          {parsePriceDraft(item) != null
                            ? formatPrice(parsePriceDraft(item))
                            : ""}
                        </span>

                        <button
                          type="button"
                          disabled={requestLoading}
                          onClick={() => void savePrice(item)}
                          className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white/80 transition hover:bg-white/10 disabled:opacity-50"
                        >
                          ذخیره کرایه
                        </button>

                        {isFull &&
                          (published ? (
                            <span className="rounded-xl bg-emerald-500/15 px-4 py-2 text-sm font-bold text-emerald-300">
                              ✓ در پنل رانندگان
                            </span>
                          ) : (
                            item.status !== "لغو شد" && (
                              <button
                                type="button"
                                disabled={publishingId === item.id}
                                onClick={() => void publishToDrivers(item)}
                                className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-400 disabled:opacity-50"
                              >
                                {publishingId === item.id
                                  ? "در حال ارسال..."
                                  : "🚛 ارسال برای رانندگان"}
                              </button>
                            )
                          ))}
                      </div>
                    </div>
                  );
                })}

                {filteredRequests.length === 0 && (
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-white/40">
                    موردی پیدا نشد.
                  </div>
                )}
              </div>
            </section>
          )}

          {activeSection ===
            "representatives" && (
            <section>
              <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <h3 className="text-xl font-black">
                      {editingRepresentativeId
                        ? "ویرایش نماینده"
                        : "ثبت نماینده جدید"}
                    </h3>

                    {editingRepresentativeId && (
                      <button
                        type="button"
                        onClick={
                          resetRepresentativeForm
                        }
                        className="text-sm text-white/50 hover:text-white"
                      >
                        انصراف
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <select
                      value={
                        representativeForm.province
                      }
                      onChange={(e) =>
                        setRepresentativeForm(
                          (current) => ({
                            ...current,
                            province:
                              e.target.value,
                            city: "",
                          })
                        )
                      }
                      className="w-full rounded-2xl border border-white/10 bg-ink-2 px-4 py-4 outline-none"
                    >
                      <option value="">
                        انتخاب استان
                      </option>

                      {provinces.map(
                        (province) => (
                          <option
                            key={
                              province.en
                            }
                            value={
                              province.en
                            }
                          >
                            {
                              province.fa
                            }
                          </option>
                        )
                      )}
                    </select>

                    <select
                      value={
                        representativeForm.city
                      }
                      onChange={(e) =>
                        setRepresentativeForm(
                          (current) => ({
                            ...current,
                            city:
                              e.target.value,
                          })
                        )
                      }
                      disabled={
                        !representativeForm.province
                      }
                      className="w-full rounded-2xl border border-white/10 bg-ink-2 px-4 py-4 outline-none disabled:opacity-40"
                    >
                      <option value="">
                        انتخاب شهر
                      </option>

                      {representativeCities.map(
                        (city) => (
                          <option
                            key={
                              city.en
                            }
                            value={
                              city.en
                            }
                          >
                            {city.fa}
                          </option>
                        )
                      )}
                    </select>

                    <input
                      value={
                        representativeForm.address
                      }
                      onChange={(e) =>
                        setRepresentativeForm(
                          (current) => ({
                            ...current,
                            address:
                              e.target.value,
                          })
                        )
                      }
                      placeholder="آدرس"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none placeholder:text-white/30 focus:border-orange-500"
                    />

                    <input
                      value={
                        representativeForm.phone
                      }
                      onChange={(e) =>
                        setRepresentativeForm(
                          (current) => ({
                            ...current,
                            phone:
                              e.target.value,
                          })
                        )
                      }
                      placeholder="تلفن ثابت"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none placeholder:text-white/30 focus:border-orange-500"
                    />

                    <input
                      value={
                        representativeForm.mobile
                      }
                      onChange={(e) =>
                        setRepresentativeForm(
                          (current) => ({
                            ...current,
                            mobile:
                              e.target.value,
                          })
                        )
                      }
                      placeholder="شماره موبایل"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none placeholder:text-white/30 focus:border-orange-500"
                    />

                    <input
                      value={
                        representativeForm.location_url
                      }
                      onChange={(e) =>
                        setRepresentativeForm(
                          (current) => ({
                            ...current,
                            location_url:
                              e.target.value,
                          })
                        )
                      }
                      placeholder="لینک موقعیت روی نقشه"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none placeholder:text-white/30 focus:border-orange-500"
                    />

                    <button
                      type="button"
                      onClick={
                        saveRepresentative
                      }
                      disabled={
                        representativeLoading
                      }
                      className="w-full rounded-2xl bg-orange-500 py-4 font-black transition hover:bg-orange-600 disabled:opacity-50"
                    >
                      {representativeLoading
                        ? "در حال ذخیره..."
                        : editingRepresentativeId
                        ? "ذخیره تغییرات"
                        : "ثبت نماینده"}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="mb-5">
                    <input
                      value={
                        representativeSearch
                      }
                      onChange={(e) =>
                        setRepresentativeSearch(
                          e.target.value
                        )
                      }
                      placeholder="جستجو بین نمایندگان..."
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 outline-none placeholder:text-white/30 focus:border-orange-500"
                    />
                  </div>

                  <div className="space-y-4">
                    {filteredRepresentatives.map(
                      (item) => (
                        <div
                          key={
                            item.id
                          }
                          className="rounded-3xl border border-white/10 bg-white/5 p-5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <h3 className="text-lg font-black">
                                {
                                  getProvinceFa(
                                    item.province
                                  )
                                }{" "}
                                -{" "}
                                {
                                  getCityFa(
                                    item.province,
                                    item.city
                                  )
                                }
                              </h3>

                              {item.address && (
                                <p className="mt-2 text-sm leading-7 text-white/55">
                                  {
                                    item.address
                                  }
                                </p>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  editRepresentative(
                                    item
                                  )
                                }
                                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15"
                              >
                                ویرایش
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  deleteRepresentative(
                                    item.id
                                  )
                                }
                                className="rounded-xl bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-500/20"
                              >
                                حذف
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-3 text-sm">
                            {item.phone && (
                              <span className="rounded-xl bg-black/10 px-3 py-2 text-white/70">
                                ☎️{" "}
                                {
                                  item.phone
                                }
                              </span>
                            )}

                            {item.mobile && (
                              <span className="rounded-xl bg-black/10 px-3 py-2 text-white/70">
                                📱{" "}
                                {
                                  item.mobile
                                }
                              </span>
                            )}

                            {item.location_url && (
                              <a
                                href={
                                  item.location_url
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-xl bg-orange-500/10 px-3 py-2 font-bold text-orange-300 hover:bg-orange-500/20"
                              >
                                📍 مشاهده موقعیت
                              </a>
                            )}
                          </div>
                        </div>
                      )
                    )}

                    {filteredRepresentatives.length ===
                      0 && (
                      <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-white/40">
                        نماینده‌ای ثبت نشده است.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection ===
            "staff" && (
            <section>
              <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <h3 className="text-xl font-black">
                      {editingStaffId
                        ? "ویرایش متصدی"
                        : "ثبت متصدی جدید"}
                    </h3>

                    {editingStaffId && (
                      <button
                        type="button"
                        onClick={
                          resetStaffForm
                        }
                        className="text-sm text-white/50 hover:text-white"
                      >
                        انصراف
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <input
                      value={
                        staffForm.name
                      }
                      onChange={(e) =>
                        setStaffForm(
                          (current) => ({
                            ...current,
                            name: e.target
                              .value,
                          })
                        )
                      }
                      placeholder="نام و نام خانوادگی"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none placeholder:text-white/30 focus:border-orange-500"
                    />

                    <input
                      value={
                        staffForm.phone
                      }
                      onChange={(e) =>
                        setStaffForm(
                          (current) => ({
                            ...current,
                            phone:
                              e.target.value,
                          })
                        )
                      }
                      placeholder="شماره موبایل"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none placeholder:text-white/30 focus:border-orange-500"
                    />

                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="font-black">
                            محدوده فعالیت
                          </p>

                          <p className="mt-1 text-xs text-white/40">
                            می‌توانید چند استان و شهر اضافه کنید.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={
                            addStaffLocationForm
                          }
                          className="rounded-xl bg-orange-500 px-3 py-2 text-sm font-black"
                        >
                          + افزودن
                        </button>
                      </div>

                      {staffLocationForms.length ===
                        0 && (
                        <p className="py-4 text-center text-sm text-white/35">
                          هنوز محدوده‌ای اضافه نشده است.
                        </p>
                      )}

                      <div className="space-y-3">
                        {staffLocationForms.map(
                          (
                            location,
                            index
                          ) => {
                            const cities =
                              location.province
                                ? getCities(
                                    location.province
                                  )
                                : [];

                            return (
                              <div
                                key={
                                  index
                                }
                                className="rounded-2xl border border-white/10 bg-white/5 p-3"
                              >
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <select
                                    value={
                                      location.province
                                    }
                                    onChange={(
                                      e
                                    ) =>
                                      updateStaffLocationForm(
                                        index,
                                        "province",
                                        e.target
                                          .value
                                      )
                                    }
                                    className="w-full rounded-xl border border-white/10 bg-ink-2 px-3 py-3 text-sm outline-none"
                                  >
                                    <option value="">
                                      انتخاب استان
                                    </option>

                                    {provinces.map(
                                      (
                                        province
                                      ) => (
                                        <option
                                          key={
                                            province.en
                                          }
                                          value={
                                            province.en
                                          }
                                        >
                                          {
                                            province.fa
                                          }
                                        </option>
                                      )
                                    )}
                                  </select>

                                  <select
                                    value={
                                      location.city
                                    }
                                    onChange={(
                                      e
                                    ) =>
                                      updateStaffLocationForm(
                                        index,
                                        "city",
                                        e.target
                                          .value
                                      )
                                    }
                                    disabled={
                                      !location.province
                                    }
                                    className="w-full rounded-xl border border-white/10 bg-ink-2 px-3 py-3 text-sm outline-none disabled:opacity-40"
                                  >
                                    <option value="*">
                                      کل استان
                                    </option>

                                    {cities.map(
                                      (
                                        city
                                      ) => (
                                        <option
                                          key={
                                            city.en
                                          }
                                          value={
                                            city.en
                                          }
                                        >
                                          {
                                            city.fa
                                          }
                                        </option>
                                      )
                                    )}
                                  </select>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeStaffLocationForm(
                                      index
                                    )
                                  }
                                  className="mt-3 text-xs font-bold text-red-300"
                                >
                                  حذف این محدوده
                                </button>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>

                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <input
                        type="checkbox"
                        checked={
                          staffForm.panel_enabled
                        }
                        onChange={(e) =>
                          setStaffForm(
                            (current) => ({
                              ...current,
                              panel_enabled:
                                e.target
                                  .checked,
                            })
                          )
                        }
                        className="h-5 w-5 accent-orange-500"
                      />

                      <div>
                        <p className="font-black">
                          فعال بودن پنل متصدی
                        </p>

                        <p className="mt-1 text-xs text-white/40">
                          متصدی می‌تواند با شماره موبایل خود وارد پنل شود.
                        </p>
                      </div>
                    </label>

                    <input
                      type="password"
                      value={
                        staffForm.password
                      }
                      onChange={(e) =>
                        setStaffForm(
                          (current) => ({
                            ...current,
                            password:
                              e.target.value,
                          })
                        )
                      }
                      placeholder="رمز عبور پنل"
                      disabled={
                        !!editingStaffId &&
                        !!staff.find(
                          (item) =>
                            item.id ===
                            editingStaffId
                        )
                          ?.auth_user_id
                      }
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none placeholder:text-white/30 focus:border-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
                    />

                    {editingStaffId &&
                      staff.find(
                        (item) =>
                          item.id ===
                          editingStaffId
                      )
                        ?.auth_user_id && (
                        <p className="rounded-2xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-xs leading-6 text-orange-200">
                          این متصدی قبلاً حساب پنل دارد؛ تغییر رمز عبور در مرحله بعد اضافه می‌شود.
                        </p>
                      )}

                    <button
                      type="button"
                      onClick={
                        saveStaff
                      }
                      disabled={
                        staffLoading
                      }
                      className="w-full rounded-2xl bg-orange-500 py-4 font-black transition hover:bg-orange-600 disabled:opacity-50"
                    >
                      {staffLoading
                        ? "در حال ذخیره..."
                        : editingStaffId
                        ? "ذخیره تغییرات"
                        : "ثبت متصدی"}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="mb-5">
                    <input
                      value={
                        staffSearch
                      }
                      onChange={(e) =>
                        setStaffSearch(
                          e.target.value
                        )
                      }
                      placeholder="جستجو بین متصدیان..."
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 outline-none placeholder:text-white/30 focus:border-orange-500"
                    />
                  </div>

                  <div className="space-y-4">
                    {filteredStaff.map(
                      (item) => {
                        const locations =
                          staffLocations[
                            item.id
                          ] || [];

                        return (
                          <div
                            key={
                              item.id
                            }
                            className="rounded-3xl border border-white/10 bg-white/5 p-5"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-lg font-black">
                                    {
                                      item.name
                                    }
                                  </h3>

                                  {item.panel_enabled && (
                                    <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-300">
                                      پنل فعال
                                    </span>
                                  )}

                                  {!item.panel_enabled && (
                                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/40">
                                      پنل غیرفعال
                                    </span>
                                  )}
                                </div>

                                <p className="mt-2 text-sm text-white/50">
                                  📱{" "}
                                  {
                                    item.phone
                                  }
                                </p>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    editStaff(
                                      item
                                    )
                                  }
                                  className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15"
                                >
                                  ویرایش
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    deleteStaff(
                                      item.id
                                    )
                                  }
                                  disabled={
                                    staffLoading
                                  }
                                  className="rounded-xl bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-500/20 disabled:opacity-40"
                                >
                                  حذف کامل
                                </button>
                              </div>
                            </div>

                            <div className="mt-5 rounded-2xl bg-black/10 p-4">
                              <p className="mb-3 text-xs font-bold text-white/40">
                                محدوده فعالیت
                              </p>

                              <div className="flex flex-wrap gap-2">
                                {locations.map(
                                  (
                                    location
                                  ) => (
                                    <span
                                      key={
                                        location.id
                                      }
                                      className="rounded-xl bg-orange-500/10 px-3 py-2 text-sm font-bold text-orange-200"
                                    >
                                      {
                                        getProvinceFa(
                                          location.province
                                        )
                                      }
                                      {" / "}
                                      {
                                        getCityFa(
                                          location.province,
                                          location.city
                                        )
                                      }
                                    </span>
                                  )
                                )}

                                {locations.length ===
                                  0 &&
                                  item.province && (
                                    <span className="rounded-xl bg-orange-500/10 px-3 py-2 text-sm font-bold text-orange-200">
                                      {
                                        getProvinceFa(
                                          item.province
                                        )
                                      }
                                      {" / "}
                                      {
                                        getCityFa(
                                          item.province,
                                          item.city
                                        )
                                      }
                                    </span>
                                  )}

                                {locations.length ===
                                  0 &&
                                  !item.province && (
                                    <span className="text-sm text-white/35">
                                      محدوده‌ای ثبت نشده است.
                                    </span>
                                  )}
                              </div>
                            </div>
                          </div>
                        );
                      }
                    )}

                    {filteredStaff.length ===
                      0 && (
                      <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-white/40">
                        هنوز متصدی ثبت نشده است.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === "customers" && (
            <section className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black">مدیریت مشتریان</h3>
                  <p className="mt-2 text-sm text-white/45">
                    مشاهده و جستجوی مشتریان ثبت‌شده در سامانه ماکان بار
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadCustomers()}
                  disabled={customerLoading}
                  className="rounded-2xl bg-orange-500 px-5 py-3 font-black transition hover:bg-orange-600 disabled:opacity-50"
                >
                  {customerLoading ? "در حال دریافت..." : "↻ به‌روزرسانی فهرست"}
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-white/45">کل مشتریان دریافت‌شده</p>
                  <p className="mt-3 text-3xl font-black text-orange-400">{customers.length.toLocaleString("fa-IR")}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-white/45">نتیجه جستجو</p>
                  <p className="mt-3 text-3xl font-black">{filteredCustomers.length.toLocaleString("fa-IR")}</p>
                </div>
              </div>

              <input
                value={customerSearch}
                onChange={(event) => setCustomerSearch(event.target.value)}
                placeholder="جستجو بر اساس نام، موبایل، شرکت یا آدرس..."
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 outline-none placeholder:text-white/30 focus:border-orange-500"
              />

              {customerError && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm leading-7 text-red-200">
                  <p className="font-black">دریافت فهرست مشتریان ناموفق بود.</p>
                  <p className="mt-1">{customerError}</p>
                  <p className="mt-2 text-red-200/70">
                    برای نمایش امن همه مشتریان، تابع Edge Function با نام admin-list-customers باید در Supabase منتشر شده باشد و دسترسی مدیر را بررسی کند.
                  </p>
                </div>
              )}

              {customerLoading && customers.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-white/60">
                  در حال بارگذاری فهرست مشتریان...
                </div>
              ) : filteredCustomers.length > 0 ? (
                <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-right text-sm">
                      <thead className="bg-white/5 text-white/50">
                        <tr>
                          <th className="px-5 py-4 font-bold">نام مشتری</th>
                          <th className="px-5 py-4 font-bold">شماره موبایل</th>
                          <th className="px-5 py-4 font-bold">شرکت</th>
                          <th className="px-5 py-4 font-bold">آدرس</th>
                          <th className="px-5 py-4 font-bold">تاریخ ثبت</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredCustomers.map((customer) => (
                          <tr key={customer.id} className="transition hover:bg-white/[0.03]">
                            <td className="px-5 py-4 font-bold">{customer.full_name || "—"}</td>
                            <td className="px-5 py-4 text-white/70" dir="ltr">{formatCustomerPhone(customer.phone)}</td>
                            <td className="px-5 py-4 text-white/70">{customer.company_name || "—"}</td>
                            <td className="max-w-xs px-5 py-4 text-white/60">{customer.address || "—"}</td>
                            <td className="px-5 py-4 text-white/50">
                              {customer.created_at
                                ? new Date(customer.created_at).toLocaleDateString("fa-IR", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : !customerError ? (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
                  <div className="mb-3 text-4xl">👥</div>
                  <p className="font-black">{customerSearch ? "مشتری‌ای با این مشخصات پیدا نشد." : "هنوز مشتری‌ای برای نمایش وجود ندارد."}</p>
                  <p className="mt-2 text-sm text-white/40">برای دریافت دوباره اطلاعات، دکمه به‌روزرسانی را بزنید.</p>
                </div>
              ) : null}
            </section>
          )}

          {activeSection === "drivers" && (
            <section>
              <div className="mb-5 flex flex-wrap items-center gap-2">
                {(Object.keys(DRIVER_STATUS_LABELS) as DriverStatus[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setDriverFilter(status)}
                    className={`rounded-2xl px-5 py-3 text-sm font-bold transition ${
                      driverFilter === status
                        ? "bg-orange-500 text-white"
                        : "bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    {DRIVER_STATUS_LABELS[status]}
                    <span className="mr-2 text-xs opacity-70">
                      {drivers
                        .filter((driver) => driver.status === status)
                        .length.toLocaleString("fa-IR")}
                    </span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => void loadDrivers()}
                  disabled={driverLoading}
                  className="mr-auto rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-white/70 hover:bg-white/5 disabled:opacity-50"
                >
                  {driverLoading ? "..." : "بروزرسانی"}
                </button>
              </div>

              <div className="space-y-3">
                {drivers
                  .filter((driver) => driver.status === driverFilter)
                  .map((driver) => (
                    <article
                      key={driver.id}
                      className="rounded-3xl border border-white/10 bg-white/5 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-black">{driver.full_name}</h3>
                          <a
                            href={`tel:${driver.phone}`}
                            dir="ltr"
                            className="mt-1 inline-block text-sm text-orange-300"
                          >
                            {formatCustomerPhone(driver.phone)}
                          </a>
                        </div>
                        <span className="text-xs text-white/40">
                          ثبت‌نام: {formatDate(driver.created_at)}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                        <div className="rounded-2xl bg-black/10 p-4">
                          <p className="text-xs text-white/40">نوع خودرو</p>
                          <p className="mt-1 font-bold">{driver.vehicle_type || "—"}</p>
                        </div>
                        <div className="rounded-2xl bg-black/10 p-4">
                          <p className="text-xs text-white/40">بارگیر</p>
                          <p className="mt-1 font-bold">{driver.vehicle_model || "—"}</p>
                        </div>
                        <div className="rounded-2xl bg-black/10 p-4">
                          <p className="text-xs text-white/40">پلاک</p>
                          <p className="mt-1 font-bold">{driver.vehicle_plate || "—"}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {driver.status !== "approved" && (
                          <button
                            type="button"
                            disabled={driverLoading}
                            onClick={() => void setDriverStatus(driver, "approved")}
                            className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-400 disabled:opacity-50"
                          >
                            ✓ فعال کردن
                          </button>
                        )}
                        {driver.status !== "rejected" && (
                          <button
                            type="button"
                            disabled={driverLoading}
                            onClick={() => void setDriverStatus(driver, "rejected")}
                            className="rounded-xl border border-red-400/30 px-5 py-2.5 text-sm font-bold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                          >
                            غیرفعال کردن
                          </button>
                        )}
                      </div>
                    </article>
                  ))}

                {drivers.filter((driver) => driver.status === driverFilter).length === 0 && (
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-white/40">
                    {driverLoading ? "در حال دریافت..." : "راننده‌ای در این بخش نیست."}
                  </div>
                )}
              </div>
            </section>
          )}

          {activeSection === "admins" && (
            <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-lg font-black">افزودن مدیر</h3>
                <p className="mt-1 text-sm leading-7 text-white/50">
                  مدیر جدید با شماره موبایل و رمز وارد پنل مدیریت می‌شود و همه‌ی دسترسی‌های شما را دارد.
                </p>

                <div className="mt-4 space-y-3">
                  <input
                    value={adminForm.name}
                    onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                    placeholder="نام و نام خانوادگی"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-white/30 focus:border-orange-500"
                  />
                  <input
                    value={adminForm.phone}
                    onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
                    placeholder="شماره موبایل، مثلاً 09121234567"
                    inputMode="tel"
                    dir="ltr"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right outline-none placeholder:text-white/30 focus:border-orange-500"
                  />
                  <input
                    type="password"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    placeholder="رمز عبور (حداقل ۸ کاراکتر)"
                    autoComplete="new-password"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-white/30 focus:border-orange-500"
                  />
                  <button
                    type="button"
                    disabled={adminSaving}
                    onClick={() => void createAdmin()}
                    className="w-full rounded-2xl bg-orange-500 px-5 py-3 font-bold text-white transition hover:bg-orange-400 disabled:opacity-50"
                  >
                    {adminSaving ? "در حال ساخت..." : "ساخت حساب مدیر"}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {admins.map((admin) => (
                  <article
                    key={admin.auth_user_id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div>
                      <p className="font-black">{admin.name || "مدیر اصلی"}</p>
                      <p dir="ltr" className="mt-1 text-right text-sm text-white/50">
                        {admin.phone ? formatCustomerPhone(admin.phone) : "ورود با ایمیل"}
                      </p>
                    </div>
                    <span className="text-xs text-white/40">{formatDate(admin.created_at)}</span>
                  </article>
                ))}
              </div>
            </section>
          )}

          {["fleet", "services", "reports", "settings"].includes(activeSection) && (
            <section className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
              <div className="mb-4 text-5xl">
                {menuItems.find((item) => item.id === activeSection)?.icon}
              </div>
              <h3 className="text-2xl font-black">
                {menuItems.find((item) => item.id === activeSection)?.label}
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/45">
                این بخش در نسخه بعدی تکمیل می‌شود.
              </p>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}