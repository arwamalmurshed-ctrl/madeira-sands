"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  ChevronLeft, ChevronRight, Plus, Trash2, Edit, LogOut, Calendar, DollarSign, 
  List, Save, X, FileText, Settings, Wifi, Car, Snowflake, Flower2,
  Waves, BedDouble, Bath, Utensils, Coffee, Sofa, TreePalmIcon, GripVertical,TrendingUp, Users, Clock, LayoutDashboard, ClipboardCopy, Megaphone
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"

const ADMIN_PASSWORD = "madeira2024"

type BookingStatus = "available" | "pending" | "confirmed"

interface Booking {
  id: string
  guest_name: string
  phone: string
  check_in: string
  check_out: string
  status: BookingStatus
  deposit_amount?: number
  deposit_paid?: boolean
  deposit_returned?: boolean
  price?: number
  is_blogger?: boolean
}

interface Price {
  type: string
  amount: number
  label: string
  description: string
}

interface SiteContent {
  [key: string]: string
}

interface Facility {
  id: string
  icon: string
  title: string
  sort_order: number
}

// Arabic month names
const arabicMonths = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
]

// Arabic day abbreviations
const arabicDays = ["س", "ح", "ن", "ث", "ر", "خ", "ج"]

// Full Arabic day names (same week order as arabicDays: starts Saturday)
const arabicFullDayNames = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"]

// Available icons for facilities
const availableIcons = [
  { value: "pool", label: "مسبح", icon: <Waves className="w-5 h-5" /> },
  { value: "bedroom", label: "غرفة نوم", icon: <BedDouble className="w-5 h-5" /> },
  { value: "bathroom", label: "دورة مياه", icon: <Bath className="w-5 h-5" /> },
  { value: "kitchen", label: "مطبخ", icon: <Utensils className="w-5 h-5" /> },
  { value: "wifi", label: "واي فاي", icon: <Wifi className="w-5 h-5" /> },
  { value: "parking", label: "موقف سيارات", icon: <Car className="w-5 h-5" /> },
  { value: "ac", label: "تكييف", icon: <Snowflake className="w-5 h-5" /> },
  { value: "garden", label: "حديقة", icon: <Flower2 className="w-5 h-5" /> },
  { value: "sofa", label: "صالة", icon: <Sofa className="w-5 h-5" /> },
  { value: "coffee", label: "ركن قهوة", icon: <Coffee className="w-5 h-5" /> },
  { value: "outdoor", label: "مجلس خارجي", icon: <TreePalmIcon className="w-5 h-5" /> },
]

const iconMap: { [key: string]: React.ReactNode } = {
  pool: <Waves className="w-5 h-5" />,
  bedroom: <BedDouble className="w-5 h-5" />,
  bathroom: <Bath className="w-5 h-5" />,
  kitchen: <Utensils className="w-5 h-5" />,
  wifi: <Wifi className="w-5 h-5" />,
  parking: <Car className="w-5 h-5" />,
  ac: <Snowflake className="w-5 h-5" />,
  garden: <Flower2 className="w-5 h-5" />,
  sofa: <Sofa className="w-5 h-5" />,
  coffee: <Coffee className="w-5 h-5" />,
  outdoor: <TreePalmIcon className="w-5 h-5" />,
}

function getStatusColor(status: BookingStatus): string {
  switch (status) {
    case "available":
      return "bg-green-500"
    case "pending":
      return "bg-amber-700"
    case "confirmed":
      return "bg-red-500"
    default:
      return "bg-green-500"
  }
}

function getStatusLabel(status: BookingStatus): string {
  switch (status) {
    case "available":
      return "متاح"
    case "pending":
      return "قيد التأكيد"
    case "confirmed":
      return "محجوز"
    default:
      return "متاح"
  }
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [passwordError, setPasswordError] = useState(false)
const [activeTab, setActiveTab] = useState<"dashboard" | "calendar" | "bookings" | "prices" | "content" | "facilities">("dashboard") 
 const [saving, setSaving] = useState(false)

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [dateStatuses, setDateStatuses] = useState<{ date: string; status: BookingStatus }[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  
  // Bookings state
  const [bookings, setBookings] = useState<Booking[]>([])
  const [showBookingDialog, setShowBookingDialog] = useState(false)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [bookingForm, setBookingForm] = useState({
    guest_name: "",
    phone: "",
    check_in: "",
    check_out: "",
    status: "pending" as BookingStatus,
    price: 0,
    deposit_amount: 0,
    deposit_paid: false,
    deposit_returned: false,
    is_blogger: false,
  })
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [confirmationCopied, setConfirmationCopied] = useState(false)
  
  // Prices state
  const [prices, setPrices] = useState<Price[]>([])
  const [pricesChanged, setPricesChanged] = useState(false)

  // Content state
  const [content, setContent] = useState<SiteContent>({})
  const [contentChanged, setContentChanged] = useState(false)

  // Facilities state
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [showFacilityDialog, setShowFacilityDialog] = useState(false)
  const [bookingsMonth, setBookingsMonth] = useState(new Date())
const [selectedBookingInfo, setSelectedBookingInfo] = useState<Booking | null>(null)
const [showBookingInfoDialog, setShowBookingInfoDialog] = useState(false)
const [bookingsForSelectedDay, setBookingsForSelectedDay] = useState<Booking[]>([])
const [showBookingListDialog, setShowBookingListDialog] = useState(false)
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null)
  const [facilityForm, setFacilityForm] = useState({
    icon: "pool",
    title: "",
  })

  const supabase = createClient()

  // Check if already authenticated
  useEffect(() => {
    const auth = localStorage.getItem("madeira_admin_auth")
    if (auth === "true") {
      setIsAuthenticated(true)
    }
  }, [])

  const loadData = useCallback(async () => {
    try {
      const [dateStatusesRes, bookingsRes, pricesRes, contentRes, facilitiesRes] = await Promise.all([
        supabase.from("date_statuses").select("*"),
        supabase.from("bookings").select("*").order("check_in"),
        supabase.from("prices").select("*"),
        supabase.from("site_content").select("*"),
        supabase.from("facilities").select("*").order("sort_order"),
      ])

      if (dateStatusesRes.data) {
        setDateStatuses(dateStatusesRes.data.map(d => ({ date: d.date, status: d.status as BookingStatus })))
      }
      if (bookingsRes.data) {
        setBookings(bookingsRes.data as Booking[])
      }
      if (pricesRes.data) {
        setPrices(pricesRes.data as Price[])
      }
      if (contentRes.data) {
        const contentMap: SiteContent = {}
        contentRes.data.forEach(item => {
          contentMap[item.key] = item.value
        })
        setContent(contentMap)
      }
      if (facilitiesRes.data) {
        setFacilities(facilitiesRes.data as Facility[])
      }
    } catch (error) {
      console.error("Error loading data:", error)
    }
  }, [supabase])

  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated, loadData])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      localStorage.setItem("madeira_admin_auth", "true")
      setPasswordError(false)
    } else {
      setPasswordError(true)
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem("madeira_admin_auth")
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    let startingDay = firstDay.getDay() + 1
    if (startingDay === 7) startingDay = 0
    return { daysInMonth, startingDay }
  }

  const { daysInMonth, startingDay } = getDaysInMonth(currentMonth)
  // Dashboard stats
const todayStr = new Date().toISOString().split("T")[0]
const todaysBookings = bookings.filter((b) => todayStr >= b.check_in && todayStr <= b.check_out)

const thisMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
const thisMonthRevenue = bookings
  .filter((b) => b.check_in.startsWith(thisMonthStr))
  .reduce((sum, b) => sum + (b.price || 0), 0)

const thisMonthDays = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
const bookedDaysThisMonth = dateStatuses.filter(
  (d) => d.date.startsWith(thisMonthStr) && d.status === "confirmed"
).length
const occupancyRate = thisMonthDays > 0 ? Math.round((bookedDaysThisMonth / thisMonthDays) * 100) : 0

const in7Days = new Date()
in7Days.setDate(in7Days.getDate() + 7)
const in7DaysStr = in7Days.toISOString().split("T")[0]
const upcomingBookings = bookings
  .filter((b) => b.check_in >= todayStr && b.check_in <= in7DaysStr)
  .sort((a, b) => a.check_in.localeCompare(b.check_in))

const unpaidDeposits = bookings.filter(
  (b) => b.status === "confirmed" && b.deposit_amount && b.deposit_amount > 0 && !b.deposit_paid
)
const confirmedThisMonth = bookings.filter(
  (b) => b.check_in.startsWith(thisMonthStr) && b.status === "confirmed"
)
  // إحصائيات البلوقرز/المعلنين: عدد هذا الشهر + الإجمالي الكلي
  const bloggersThisMonth = bookings.filter(
    (b) => b.is_blogger && b.check_in.startsWith(thisMonthStr)
  )
  const bloggersAllTime = bookings.filter((b) => b.is_blogger)
  const getBookingsForDate = (dateStr: string): Booking[] => {
    return bookings.filter((b) => dateStr >= b.check_in && dateStr <= b.check_out)
  }
  
  const handleBookingsDayClick = (day: number) => {
    const dateStr = `${bookingsMonth.getFullYear()}-${String(bookingsMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const dayBookings = getBookingsForDate(dateStr)
    if (dayBookings.length === 1) {
      if (!dayBookings[0].guest_name) {
        // حجز موجود لكن بدون اسم ضيف (بيانات ناقصة) - افتحي نموذج التعديل مباشرة للإكمال
        // ونعبّي السعر والتأمين تلقائياً حسب اليوم لو كانوا فاضيين بالحجز الناقص
        const existing = dayBookings[0]
        setEditingBooking(existing)
        setBookingForm({
          guest_name: existing.guest_name || "",
          phone: existing.phone || "",
          check_in: existing.check_in,
          check_out: existing.check_out,
          status: existing.status,
          price: existing.price || getDefaultPriceForDate(existing.check_in),
          deposit_amount: existing.deposit_amount || DEFAULT_DEPOSIT,
          deposit_paid: existing.deposit_paid || false,
          deposit_returned: existing.deposit_returned || false,
          is_blogger: existing.is_blogger || false,
        })
        setSaveMessage(null)
        setShowBookingDialog(true)
      } else {
        setSelectedBookingInfo(dayBookings[0])
        setShowBookingInfoDialog(true)
      }
    } else if (dayBookings.length > 1) {
      setBookingsForSelectedDay(dayBookings)
      setShowBookingListDialog(true)
    } else {
      // ما فيه حجز بهذا اليوم بعد - افتحي نموذج إضافة حجز جديد جاهز بالتاريخ والسعر والتأمين
      setEditingBooking(null)
      setBookingForm({
        guest_name: "",
        phone: "",
        check_in: dateStr,
        check_out: dateStr,
        status: "pending",
        price: getDefaultPriceForDate(dateStr),
        deposit_amount: DEFAULT_DEPOSIT,
        deposit_paid: false,
        deposit_returned: false,
      })
      setSaveMessage(null)
      setShowBookingDialog(true)
    }
  }

  const getDateStatusFromStore = (day: number): BookingStatus => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const found = dateStatuses.find((s) => s.date === dateStr)
    return found?.status || "available"
  }

  const handleDateClick = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    setSelectedDate(dateStr)
    setShowStatusDialog(true)
  }

  const handleStatusChange = async (status: BookingStatus) => {
    if (selectedDate) {
      setSaving(true)
      try {
        await supabase.from("date_statuses").upsert({
          date: selectedDate,
          status,
          updated_at: new Date().toISOString(),
        })
        await loadData()
      } catch (error) {
        console.error("Error updating status:", error)
      } finally {
        setSaving(false)
      }
    }
    setShowStatusDialog(false)
    setSelectedDate(null)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getDate()} ${arabicMonths[date.getMonth()]} ${date.getFullYear()}`
  }

  const getArabicDayName = (dateStr: string) => {
    const date = new Date(dateStr)
    let idx = date.getDay() + 1
    if (idx === 7) idx = 0
    return arabicFullDayNames[idx]
  }

  // الأسعار الثابتة: الخميس والجمعة 790، وبقية الأيام 690. التأمين ثابت 300 لكل الحجوزات
  const DEFAULT_DEPOSIT = 300
  const getDefaultPriceForDate = (dateStr: string) => {
    if (!dateStr) return 0
    const day = new Date(dateStr).getDay() // 4 = الخميس، 5 = الجمعة
    return day === 4 || day === 5 ? 790 : 690
  }

  const generateConfirmationMessage = (booking: Booking) => {
    const dayName = getArabicDayName(booking.check_in)
    const dateFormatted = booking.check_in.split("-").join("/")
    // مبلغ التأمين منفصل تماماً عن سعر الإيجار (عربون يصير تأمين مسترجع لاحقاً) - لا يُخصم من السعر
    const remaining = booking.price || 0
    return `تم تأكيد حجزكم :
يوم: ${dayName}
${dateFormatted}
علماً أنه متبقي مبلغ الايجار ( ${remaining} )ريال
يتم تحويله قبل الدخول للشاليه في يوم حجزكم
مع جزيل الشكر 🌹🌹
ال${booking.deposit_amount || 0} عربون وراح تكون تأمين نسترجعه لكم بعد الخروج من الشاليه`
  }

  const handleCopyConfirmation = async (booking: Booking) => {
    const message = generateConfirmationMessage(booking)
    try {
      await navigator.clipboard.writeText(message)
      setConfirmationCopied(true)
      setTimeout(() => setConfirmationCopied(false), 2500)
    } catch (error) {
      console.error("Error copying message:", error)
      alert("تعذر نسخ الرسالة، حاول مرة أخرى")
    }
  }

  const handleAddBooking = () => {
    setEditingBooking(null)
    setBookingForm({
      guest_name: "",
      phone: "",
      check_in: "",
      check_out: "",
      status: "pending",
      price: 0,
      deposit_amount: 0,
      deposit_paid: false,
      deposit_returned: false,
      is_blogger: false,
    })
    setSaveMessage(null)
    setShowBookingDialog(true)
  }

  // إضافة حجز ثاني لنفس اليوم (لما يكون فيه حجز موجود أصلاً بهذا التاريخ)، مع تعبئة السعر والتأمين تلقائياً
  const handleAddSecondBooking = (dateStr: string) => {
    setEditingBooking(null)
    setBookingForm({
      guest_name: "",
      phone: "",
      check_in: dateStr,
      check_out: dateStr,
      status: "pending",
      price: getDefaultPriceForDate(dateStr),
      deposit_amount: DEFAULT_DEPOSIT,
      deposit_paid: false,
      deposit_returned: false,
      is_blogger: false,
    })
    setSaveMessage(null)
    setShowBookingDialog(true)
  }

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking)
    setBookingForm({
      guest_name: booking.guest_name,
      phone: booking.phone,
      check_in: booking.check_in,
      check_out: booking.check_out,
      status: booking.status,
      price: booking.price || 0,
      deposit_amount: booking.deposit_amount || 0,
      deposit_paid: booking.deposit_paid || false,
      deposit_returned: booking.deposit_returned || false,
      is_blogger: booking.is_blogger || false,
    })
    setSaveMessage(null)
    setShowBookingDialog(true)
  }

  const handleSaveBooking = async () => {
    if (!bookingForm.guest_name || !bookingForm.phone || !bookingForm.check_in || !bookingForm.check_out) {
      setSaveMessage({ type: "error", text: "الرجاء تعبئة كل الحقول المطلوبة (الاسم، الهاتف، تاريخ الوصول والمغادرة)" })
      return
    }

    setSaving(true)
    setSaveMessage(null)
    try {
      let saveError: { message: string } | null = null

      if (editingBooking) {
        const { error } = await supabase.from("bookings").update({
          guest_name: bookingForm.guest_name,
          phone: bookingForm.phone,
          check_in: bookingForm.check_in,
          check_out: bookingForm.check_out,
          status: bookingForm.status,
          price: bookingForm.price || 0,
          deposit_amount: bookingForm.deposit_amount || 0,
          deposit_paid: bookingForm.deposit_paid || false,
          deposit_returned: bookingForm.deposit_returned || false,
          is_blogger: bookingForm.is_blogger || false,
          updated_at: new Date().toISOString(),
        }).eq("id", editingBooking.id).select()
        saveError = error
      } else {
        const { error } = await supabase.from("bookings").insert({
          guest_name: bookingForm.guest_name,
          phone: bookingForm.phone,
          check_in: bookingForm.check_in,
          check_out: bookingForm.check_out,
          status: bookingForm.status,
          price: bookingForm.price || 0,
          deposit_amount: bookingForm.deposit_amount || 0,
          deposit_paid: bookingForm.deposit_paid || false,
          deposit_returned: bookingForm.deposit_returned || false,
          is_blogger: bookingForm.is_blogger || false,
        }).select()
        saveError = error
      }

      if (saveError) {
        console.error("Error saving booking:", saveError)
        setSaveMessage({ type: "error", text: `فشل حفظ الحجز: ${saveError.message}. الحجز لم يُحفظ، حاول مرة أخرى.` })
        setSaving(false)
        return
      }

      // Update date statuses for the booking range
      const start = new Date(bookingForm.check_in)
      const end = new Date(bookingForm.check_out)
      const datesToUpdate = []
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        datesToUpdate.push({
          date: d.toISOString().split("T")[0],
          status: bookingForm.status,
          updated_at: new Date().toISOString(),
        })
      }
      if (datesToUpdate.length > 0) {
        await supabase.from("date_statuses").upsert(datesToUpdate)
      }

      await loadData()
      setSaveMessage({ type: "success", text: editingBooking ? "تم تحديث الحجز بنجاح ✓" : "تم حفظ الحجز بنجاح ✓" })
      setTimeout(() => {
        setShowBookingDialog(false)
        setSaveMessage(null)
      }, 700)
    } catch (error) {
      console.error("Error saving booking:", error)
      setSaveMessage({ type: "error", text: "حدث خطأ غير متوقع أثناء الحفظ. تأكد من اتصالك بالإنترنت وحاول مرة أخرى." })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteBooking = async (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذا الحجز؟")) {
      setSaving(true)
      try {
        await supabase.from("bookings").delete().eq("id", id)
        await loadData()
      } catch (error) {
        console.error("Error deleting booking:", error)
      } finally {
        setSaving(false)
      }
    }
  }

  const handleSavePrices = async () => {
    setSaving(true)
    try {
      for (const price of prices) {
        await supabase.from("prices").upsert({
          type: price.type,
          amount: price.amount,
          label: price.label,
          description: price.description,
          updated_at: new Date().toISOString(),
        })
      }
      setPricesChanged(false)
    } catch (error) {
      console.error("Error saving prices:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveContent = async () => {
    setSaving(true)
    try {
      for (const [key, value] of Object.entries(content)) {
        await supabase.from("site_content").upsert({
          key,
          value,
          updated_at: new Date().toISOString(),
        })
      }
      setContentChanged(false)
    } catch (error) {
      console.error("Error saving content:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleAddFacility = () => {
    setEditingFacility(null)
    setFacilityForm({ icon: "pool", title: "" })
    setShowFacilityDialog(true)
  }

  const handleEditFacility = (facility: Facility) => {
    setEditingFacility(facility)
    setFacilityForm({ icon: facility.icon, title: facility.title })
    setShowFacilityDialog(true)
  }

  const handleSaveFacility = async () => {
    if (!facilityForm.title) return

    setSaving(true)
    try {
      if (editingFacility) {
        await supabase.from("facilities").update({
          icon: facilityForm.icon,
          title: facilityForm.title,
        }).eq("id", editingFacility.id)
      } else {
        const maxOrder = Math.max(...facilities.map(f => f.sort_order), 0)
        await supabase.from("facilities").insert({
          icon: facilityForm.icon,
          title: facilityForm.title,
          sort_order: maxOrder + 1,
        })
      }
      await loadData()
      setShowFacilityDialog(false)
    } catch (error) {
      console.error("Error saving facility:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteFacility = async (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذا المرفق؟")) {
      setSaving(true)
      try {
        await supabase.from("facilities").delete().eq("id", id)
        await loadData()
      } catch (error) {
        console.error("Error deleting facility:", error)
      } finally {
        setSaving(false)
      }
    }
  }

  const updatePrice = (type: string, amount: number) => {
    setPrices(prices.map(p => p.type === type ? { ...p, amount } : p))
    setPricesChanged(true)
  }

  const updateContent = (key: string, value: string) => {
    setContent({ ...content, [key]: value })
    setContentChanged(true)
  }

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div dir="rtl" className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-stone-800 flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
              MS
            </div>
            <h1 className="text-2xl font-bold text-stone-800">لوحة تحكم المسؤول</h1>
            <p className="text-stone-500 mt-2">Madeira Sands</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="password">كلمة المرور</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setPasswordError(false)
                  }}
                  placeholder="أدخل كلمة المرور"
                  className={passwordError ? "border-red-500" : ""}
                />
                {passwordError && (
                  <p className="text-red-500 text-sm mt-1">كلمة المرور غير صحيحة</p>
                )}
              </div>
              <Button type="submit" className="w-full bg-stone-800 hover:bg-stone-700">
                دخول
              </Button>
            </div>
          </form>
        </Card>
      </div>
    )
  }

  // Admin Dashboard
  return (
    <div dir="rtl" className="min-h-screen bg-stone-100">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center text-white font-bold">
              MS
            </div>
            <div>
              <h1 className="font-semibold text-stone-800">لوحة تحكم المسؤول</h1>
              <p className="text-xs text-stone-500">Madeira Sands</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            خروج
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-stone-200 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2">
          <button
  onClick={() => setActiveTab("dashboard")}
  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
    activeTab === "dashboard"
      ? "border-stone-800 text-stone-800"
      : "border-transparent text-stone-500 hover:text-stone-700"
  }`}
>
  <LayoutDashboard className="w-4 h-4" />
  الرئيسية
</button>
<button
  onClick={() => setActiveTab("calendar")}
  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
    activeTab === "calendar"
      ? "border-stone-800 text-stone-800"
      : "border-transparent text-stone-500 hover:text-stone-700"
  }`}
>
  <Calendar className="w-4 h-4" />
  التقويم
</button>
            <button
              onClick={() => setActiveTab("bookings")}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "bookings"
                  ? "border-stone-800 text-stone-800"
                  : "border-transparent text-stone-500 hover:text-stone-700"
              }`}
            >
              <List className="w-4 h-4" />
              الحجوزات
            </button>
            <button
              onClick={() => setActiveTab("prices")}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "prices"
                  ? "border-stone-800 text-stone-800"
                  : "border-transparent text-stone-500 hover:text-stone-700"
              }`}
            >
              <DollarSign className="w-4 h-4" />
              الأسعار
            </button>
            <button
              onClick={() => setActiveTab("content")}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "content"
                  ? "border-stone-800 text-stone-800"
                  : "border-transparent text-stone-500 hover:text-stone-700"
              }`}
            >
              <FileText className="w-4 h-4" />
              المحتوى
            </button>
            <button
              onClick={() => setActiveTab("facilities")}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "facilities"
                  ? "border-stone-800 text-stone-800"
                  : "border-transparent text-stone-500 hover:text-stone-700"
              }`}
            >
              <Settings className="w-4 h-4" />
              المرافق
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Dashboard Tab */}
{activeTab === "dashboard" && (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold text-stone-800">نظرة عامة</h2>

    {/* Stat cards grid */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-stone-500">حجوزات اليوم</span>
          <Calendar className="w-5 h-5 text-stone-400" />
        </div>
        <p className="text-2xl font-bold text-stone-800">{todaysBookings.length}</p>
      </Card>
      <Card className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-stone-500">إيرادات الشهر</span>
          <DollarSign className="w-5 h-5 text-stone-400" />
        </div>
        <p className="text-2xl font-bold text-stone-800">{thisMonthRevenue.toLocaleString()} ر.س</p>
      </Card>
      <Card className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-stone-500">نسبة الإشغال</span>
          <TrendingUp className="w-5 h-5 text-stone-400" />
        </div>
        <p className="text-2xl font-bold text-stone-800">{occupancyRate}%</p>
      </Card>
      <Card
  className="p-5 cursor-pointer hover:ring-2 hover:ring-stone-300 transition-all"
  onClick={() => {
    if (confirmedThisMonth.length > 0) {
      setBookingsForSelectedDay(confirmedThisMonth)
      setShowBookingListDialog(true)
    }
  }}
>
  <div className="flex items-center justify-between mb-2">
    <span className="text-sm text-stone-500">حجوزات مؤكدة هذا الشهر</span>
    <Users className="w-5 h-5 text-stone-400" />
  </div>
  <p className="text-2xl font-bold text-stone-800">{confirmedThisMonth.length}</p>
</Card>
      <Card
  className="p-5 cursor-pointer hover:ring-2 hover:ring-purple-300 transition-all bg-purple-50 border-purple-200"
  onClick={() => {
    if (bloggersThisMonth.length > 0) {
      setBookingsForSelectedDay(bloggersThisMonth)
      setShowBookingListDialog(true)
    }
  }}
>
  <div className="flex items-center justify-between mb-2">
    <span className="text-sm text-purple-700">بلوقرز هذا الشهر</span>
    <Megaphone className="w-5 h-5 text-purple-500" />
  </div>
  <p className="text-2xl font-bold text-purple-800">{bloggersThisMonth.length}</p>
  <p className="text-xs text-purple-500 mt-1">الإجمالي الكلي: {bloggersAllTime.length}</p>
</Card>
    </div>

    {/* Upcoming bookings */}
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-stone-600" />
        <h3 className="text-lg font-semibold text-stone-800">حجوزات قادمة (خلال 7 أيام)</h3>
      </div>
      {upcomingBookings.length === 0 ? (
        <p className="text-stone-500 text-sm">لا توجد حجوزات قادمة خلال الأسبوع القادم</p>
      ) : (
        <div className="space-y-3">
          {upcomingBookings.map((booking) => (
            <div key={booking.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
              <div>
                <p className="font-medium text-stone-800">{booking.guest_name}</p>
                <p className="text-sm text-stone-500">{formatDate(booking.check_in)}</p>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  booking.status === "available"
                    ? "bg-green-100 text-green-800"
                    : booking.status === "pending"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {getStatusLabel(booking.status)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>

    {/* Unpaid deposits */}
    {unpaidDeposits.length > 0 && (
      <Card className="p-6 border-amber-200 bg-amber-50">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-amber-700" />
          <h3 className="text-lg font-semibold text-amber-900">تأمينات غير مدفوعة</h3>
        </div>
        <div className="space-y-3">
          {unpaidDeposits.map((booking) => (
            <div key={booking.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
              <div>
                <p className="font-medium text-stone-800">{booking.guest_name}</p>
                <p className="text-sm text-stone-500">{formatDate(booking.check_in)}</p>
              </div>
              <span className="font-semibold text-amber-700">{booking.deposit_amount} ر.س</span>
            </div>
          ))}
        </div>
      </Card>
    )}
  </div>
)}{/* Calendar Tab */}
        {activeTab === "calendar" && (
          <div>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-stone-800">إدارة التقويم</h2>
                <p className="text-sm text-stone-500">اضغط على أي تاريخ لتغيير حالته</p>
              </div>

              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-stone-600" />
                </button>
                <h3 className="text-xl font-semibold text-stone-800">
                  {arabicMonths[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-stone-600" />
                </button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {arabicDays.map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-stone-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startingDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const status = getDateStatusFromStore(day)

                  return (
                    <button
                      key={day}
                      onClick={() => handleDateClick(day)}
                      className={`
                        aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all
                        hover:ring-2 hover:ring-stone-400 cursor-pointer relative
                        ${status === "available" ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}
                        ${status === "pending" ? "bg-amber-100 text-amber-800 hover:bg-amber-200" : ""}
                        ${status === "confirmed" ? "bg-red-100 text-red-800 hover:bg-red-200" : ""}
                      `}
                    >
                      <span>{day}</span>
                      <div className={`w-2 h-2 rounded-full mt-1 ${getStatusColor(status)}`} />
                    </button>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor("available")}`} />
                  <span className="text-stone-600">متاح</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor("pending")}`} />
                  <span className="text-stone-600">قيد التأكيد</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor("confirmed")}`} />
                  <span className="text-stone-600">محجوز</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Bookings Tab */}
{activeTab === "bookings" && (
  <div>
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-stone-800">قائمة الحجوزات</h2>
        <Button onClick={handleAddBooking} className="gap-2 bg-stone-800 hover:bg-stone-700">
          <Plus className="w-4 h-4" />
          إضافة حجز
        </Button>
      </div>

      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setBookingsMonth(new Date(bookingsMonth.getFullYear(), bookingsMonth.getMonth() - 1))}
          className="p-2 hover:bg-stone-100 rounded-full transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-stone-600" />
        </button>
        <h3 className="text-xl font-semibold text-stone-800">
          {arabicMonths[bookingsMonth.getMonth()]} {bookingsMonth.getFullYear()}
        </h3>
        <button
          onClick={() => setBookingsMonth(new Date(bookingsMonth.getFullYear(), bookingsMonth.getMonth() + 1))}
          className="p-2 hover:bg-stone-100 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-stone-600" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {arabicDays.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-stone-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      {(() => {
        const { daysInMonth: bDaysInMonth, startingDay: bStartingDay } = getDaysInMonth(bookingsMonth)
        const getDayStatus = (day: number): BookingStatus => {
          const dateStr = `${bookingsMonth.getFullYear()}-${String(bookingsMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          const found = dateStatuses.find((s) => s.date === dateStr)
          return found?.status || "available"
        }
        // هل فيه حجز بلوقر/معلن بهذا اليوم؟ (لون داخلي خاص بالأدمن فقط، ما يظهر للعملاء بالموقع العام)
        const dayHasBlogger = (day: number): boolean => {
          const dateStr = `${bookingsMonth.getFullYear()}-${String(bookingsMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          return getBookingsForDate(dateStr).some((b) => b.is_blogger)
        }
        return (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: bStartingDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: bDaysInMonth }).map((_, i) => {
              const day = i + 1
              const status = getDayStatus(day)
              const isBlogger = dayHasBlogger(day)

              return (
                <button
                  key={day}
                  onClick={() => handleBookingsDayClick(day)}
                  className={`
                    aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all
                    hover:ring-2 hover:ring-stone-400 cursor-pointer relative
                    ${isBlogger ? "bg-purple-100 text-purple-800 hover:bg-purple-200" : ""}
                    ${!isBlogger && status === "available" ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}
                    ${!isBlogger && status === "pending" ? "bg-amber-100 text-amber-800 hover:bg-amber-200" : ""}
                    ${!isBlogger && status === "confirmed" ? "bg-red-100 text-red-800 hover:bg-red-200" : ""}
                  `}
                >
                  <span>{day}</span>
                  <div className={`w-2 h-2 rounded-full mt-1 ${isBlogger ? "bg-purple-500" : getStatusColor(status)}`} />
                </button>
              )
            })}
          </div>
        )
      })()}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-6 text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor("available")}`} />
          <span className="text-stone-600">متاح</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor("pending")}`} />
          <span className="text-stone-600">قيد التأكيد</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor("confirmed")}`} />
          <span className="text-stone-600">محجوز</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-stone-600">بلوقر / معلن (داخلي فقط)</span>
        </div>
      </div>

      <p className="text-center text-sm text-stone-500 mt-4">اضغط على أي يوم فيه حجز لعرض تفاصيله</p>
    </Card>
  </div>
)}


        {/* Prices Tab */}
        {activeTab === "prices" && (
          <div>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-stone-800">إدارة الأسعار</h2>
                {pricesChanged && (
                  <Button onClick={handleSavePrices} disabled={saving} className="gap-2 bg-green-600 hover:bg-green-700">
                    <Save className="w-4 h-4" />
                    {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
                  </Button>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {prices.map((price) => (
                  <div key={price.type} className="space-y-2">
                    <Label>{price.label || price.type}</Label>
                    <p className="text-sm text-stone-500">{price.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        value={price.amount}
                        onChange={(e) => updatePrice(price.type, Number(e.target.value))}
                        className="text-lg"
                      />
                      <span className="text-stone-500 whitespace-nowrap">ر.س</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
                التغييرات ستظهر فوراً لجميع الزوار على صفحة الأسعار
              </div>
            </Card>
          </div>
        )}

        {/* Content Tab */}
        {activeTab === "content" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-stone-800">إدارة المحتوى</h2>
              {contentChanged && (
                <Button onClick={handleSaveContent} disabled={saving} className="gap-2 bg-green-600 hover:bg-green-700">
                  <Save className="w-4 h-4" />
                  {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
                </Button>
              )}
            </div>

            {/* General Settings */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-stone-800 mb-4">الإعدادات العامة</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>اسم الشاليه</Label>
                  <Input
                    value={content.chalet_name || ""}
                    onChange={(e) => updateContent("chalet_name", e.target.value)}
                    placeholder="Madeira Sands"
                  />
                </div>
                <div>
                  <Label>الموقع</Label>
                  <Input
                    value={content.hero_location || ""}
                    onChange={(e) => updateContent("hero_location", e.target.value)}
                    placeholder="القصيم - بريدة"
                  />
                </div>
              </div>
            </Card>

            {/* Hero Section */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-stone-800 mb-4">قسم الترحيب (Hero)</h3>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>العنوان الرئيسي</Label>
                    <Input
                      value={content.hero_title || ""}
                      onChange={(e) => updateContent("hero_title", e.target.value)}
                      placeholder="ملاذ صيفي فاخر"
                    />
                  </div>
                  <div>
                    <Label>العنوان الفرعي</Label>
                    <Input
                      value={content.hero_subtitle || ""}
                      onChange={(e) => updateContent("hero_subtitle", e.target.value)}
                      placeholder="أجواء استجمام استثنائية"
                    />
                  </div>
                </div>
                <div>
                  <Label>الوصف</Label>
                  <Textarea
                    value={content.hero_description || ""}
                    onChange={(e) => updateContent("hero_description", e.target.value)}
                    placeholder="استمتع بتجربة إقامة لا تُنسى..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>نص زر الحجز</Label>
                  <Input
                    value={content.hero_button || ""}
                    onChange={(e) => updateContent("hero_button", e.target.value)}
                    placeholder="احجز الآن"
                  />
                </div>
              </div>
            </Card>

            {/* Sections Titles */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-stone-800 mb-4">عناوين الأقسام</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>عنوان قسم المرافق</Label>
                  <Input
                    value={content.facilities_title || ""}
                    onChange={(e) => updateContent("facilities_title", e.target.value)}
                    placeholder="المرافق والخدمات"
                  />
                </div>
                <div>
                  <Label>وصف قسم المرافق</Label>
                  <Input
                    value={content.facilities_subtitle || ""}
                    onChange={(e) => updateContent("facilities_subtitle", e.target.value)}
                    placeholder="كل ما تحتاجه لإقامة مريحة"
                  />
                </div>
                <div>
                  <Label>عنوان قسم الأسعار</Label>
                  <Input
                    value={content.pricing_title || ""}
                    onChange={(e) => updateContent("pricing_title", e.target.value)}
                    placeholder="الأسعار"
                  />
                </div>
                <div>
                  <Label>وصف قسم الأسعار</Label>
                  <Input
                    value={content.pricing_subtitle || ""}
                    onChange={(e) => updateContent("pricing_subtitle", e.target.value)}
                    placeholder="أسعار تنافسية تناسب جميع المناسبات"
                  />
                </div>
                <div>
                  <Label>عنوان قسم الموقع</Label>
                  <Input
                    value={content.location_title || ""}
                    onChange={(e) => updateContent("location_title", e.target.value)}
                    placeholder="الموقع"
                  />
                </div>
                <div>
                  <Label>العنوان التفصيلي</Label>
                  <Input
                    value={content.location_address || ""}
                    onChange={(e) => updateContent("location_address", e.target.value)}
                    placeholder="بريدة، القصيم، المملكة العربية السعودية"
                  />
                </div>
              </div>
            </Card>

            {/* Contact Info */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-stone-800 mb-4">معلومات التواصل</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>رقم الواتساب (بدون +)</Label>
                  <Input
                    value={content.contact_whatsapp || ""}
                    onChange={(e) => updateContent("contact_whatsapp", e.target.value)}
                    placeholder="966501234567"
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label>رابط Instagram</Label>
                  <Input
                    value={content.contact_instagram || ""}
                    onChange={(e) => updateContent("contact_instagram", e.target.value)}
                    placeholder="https://instagram.com/..."
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label>رابط TikTok</Label>
                  <Input
                    value={content.contact_tiktok || ""}
                    onChange={(e) => updateContent("contact_tiktok", e.target.value)}
                    placeholder="https://tiktok.com/@..."
                    dir="ltr"
                  />
                </div>
              </div>
            </Card>

            {/* Footer */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-stone-800 mb-4">التذييل</h3>
              <div>
                <Label>نص حقوق النشر</Label>
                <Input
                  value={content.footer_rights || ""}
                  onChange={(e) => updateContent("footer_rights", e.target.value)}
                  placeholder="جميع الحقوق محفوظة"
                />
              </div>
            </Card>

            <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
              جميع التغييرات ستظهر فوراً لجميع الزوار على الموقع
            </div>
          </div>
        )}

        {/* Facilities Tab */}
        {activeTab === "facilities" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-stone-800">إدارة المرافق</h2>
              <Button onClick={handleAddFacility} className="gap-2 bg-stone-800 hover:bg-stone-700">
                <Plus className="w-4 h-4" />
                إضافة مرفق
              </Button>
            </div>

            {facilities.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-stone-500">لا توجد مرافق حالياً</p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {facilities.map((facility) => (
                  <Card key={facility.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600">
                          {iconMap[facility.icon] || <Waves className="w-5 h-5" />}
                        </div>
                        <span className="font-medium text-stone-800">{facility.title}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditFacility(facility)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteFacility(facility.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
              المرافق ستظهر في قسم المرافق والخدمات على الصفحة الرئيسية
            </div>
          </div>
        )}
      </main>

      {/* Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تغيير حالة التاريخ</DialogTitle>
            <DialogDescription>
              {selectedDate && formatDate(selectedDate)}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <Button
              variant="outline"
              className="justify-start gap-3 h-14"
              onClick={() => handleStatusChange("available")}
              disabled={saving}
            >
              <div className={`w-4 h-4 rounded-full ${getStatusColor("available")}`} />
              <span>متاح</span>
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-3 h-14"
              onClick={() => handleStatusChange("pending")}
              disabled={saving}
            >
              <div className={`w-4 h-4 rounded-full ${getStatusColor("pending")}`} />
              <span>قيد التأكيد</span>
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-3 h-14"
              onClick={() => handleStatusChange("confirmed")}
              disabled={saving}
            >
              <div className={`w-4 h-4 rounded-full ${getStatusColor("confirmed")}`} />
              <span>محجوز</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingBooking ? "تعديل الحجز" : "إضافة حجز جديد"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="guestName">اسم الضيف</Label>
              <Input
                id="guestName"
                value={bookingForm.guest_name}
                onChange={(e) => setBookingForm({ ...bookingForm, guest_name: e.target.value })}
                placeholder="أدخل اسم الضيف"
              />
            </div>
            <div>
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input
                id="phone"
                value={bookingForm.phone}
                onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                placeholder="05xxxxxxxx"
                dir="ltr"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="checkIn">تاريخ الوصول</Label>
                <Input
                  id="checkIn"
                  type="date"
                  value={bookingForm.check_in}
                  onChange={(e) => {
                    const newDate = e.target.value
                    setBookingForm({
                      ...bookingForm,
                      check_in: newDate,
                      price: bookingForm.is_blogger ? 0 : getDefaultPriceForDate(newDate),
                      deposit_amount: bookingForm.is_blogger ? 0 : DEFAULT_DEPOSIT,
                    })
                  }}
                />
              </div>
              <div>
                <Label htmlFor="checkOut">تاريخ المغادرة</Label>
                <Input
                  id="checkOut"
                  type="date"
                  value={bookingForm.check_out}
                  onChange={(e) => setBookingForm({ ...bookingForm, check_out: e.target.value })}
                />
              </div>
            </div>
            <div>
              {saveMessage && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-lg text-sm mb-4 ${
                    saveMessage.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                  }`}
                >
                  <span>{saveMessage.text}</span>
                </div>
              )}
            </div>
            {!bookingForm.is_blogger && (
              <div>
                <Label htmlFor="price">السعر (ر.س)</Label>
                <Input
                  id="price"
                  type="number"
                  value={bookingForm.price || 0}
                  onChange={(e) => setBookingForm({ ...bookingForm, price: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
            )}
            <div>
              <Label htmlFor="status">الحالة</Label>
              <Select
                value={bookingForm.status}
                onValueChange={(value) => setBookingForm({ ...bookingForm, status: value as BookingStatus })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">قيد التأكيد</SelectItem>
                  <SelectItem value="confirmed">محجوز</SelectItem>
                  <SelectItem value="available">متاح</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
              <input
                type="checkbox"
                id="is_blogger"
                checked={bookingForm.is_blogger || false}
                onChange={(e) => {
                  const checked = e.target.checked
                  setBookingForm({
                    ...bookingForm,
                    is_blogger: checked,
                    price: checked ? 0 : getDefaultPriceForDate(bookingForm.check_in),
                    deposit_amount: checked ? 0 : DEFAULT_DEPOSIT,
                  })
                }}
              />
              <Label htmlFor="is_blogger" className="text-purple-800">حجز بلوقر / معلن (تسويقي - بدون مقابل مادي)</Label>
            </div>

            {/* Deposit / Insurance fields - مخفية للحجوزات المجانية (بلوقرز) */}
            {!bookingForm.is_blogger && (
              <>
                <div>
                  <Label htmlFor="deposit">مبلغ التأمين</Label>
                  <Input
                    id="deposit"
                    type="number"
                    value={bookingForm.deposit_amount || 0}
                    onChange={(e) => setBookingForm({ ...bookingForm, deposit_amount: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="deposit_paid"
                    checked={bookingForm.deposit_paid || false}
                    onChange={(e) => setBookingForm({ ...bookingForm, deposit_paid: e.target.checked })}
                  />
                  <Label htmlFor="deposit_paid">تم دفع التأمين</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="deposit_returned"
                    checked={bookingForm.deposit_returned || false}
                    onChange={(e) => setBookingForm({ ...bookingForm, deposit_returned: e.target.checked })}
                  />
                  <Label htmlFor="deposit_returned">تم استرجاع التأمين</Label>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowBookingDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveBooking} disabled={saving} className="bg-stone-800 hover:bg-stone-700">
              {saving ? "جاري الحفظ..." : editingBooking ? "تحديث" : "إضافة الحجز"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking List Dialog (when multiple bookings same day) */}
<Dialog open={showBookingListDialog} onOpenChange={setShowBookingListDialog}>
  <DialogContent className="sm:max-w-md" dir="rtl">
    <DialogHeader>
      <DialogTitle>اختر الحجز</DialogTitle>
      <DialogDescription>يوجد أكثر من حجز بهذا التاريخ</DialogDescription>
    </DialogHeader>
    <div className="grid gap-3 py-4">
      {bookingsForSelectedDay.map((booking) => (
        <Button
          key={booking.id}
          variant="outline"
          className="justify-between h-auto py-3"
          onClick={() => {
            setSelectedBookingInfo(booking)
            setShowBookingListDialog(false)
            setShowBookingInfoDialog(true)
          }}
        >
          <span className="font-semibold text-stone-800">{booking.guest_name || "بدون اسم"}</span>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              booking.status === "available"
                ? "bg-green-100 text-green-800"
                : booking.status === "pending"
                ? "bg-amber-100 text-amber-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {getStatusLabel(booking.status)}
          </span>
        </Button>
      ))}
      {bookingsForSelectedDay.length > 0 && (
        <Button
          variant="outline"
          className="text-stone-600 hover:text-stone-700 hover:bg-stone-100"
          onClick={() => {
            handleAddSecondBooking(bookingsForSelectedDay[0].check_in)
            setShowBookingListDialog(false)
          }}
        >
          <Plus className="w-4 h-4" />
          إضافة حجز آخر لنفس اليوم
        </Button>
      )}
    </div>
  </DialogContent>
</Dialog>{/* Booking Info Dialog (from calendar click) */}
<Dialog open={showBookingInfoDialog} onOpenChange={setShowBookingInfoDialog}>
  <DialogContent className="sm:max-w-md" dir="rtl">
    <DialogHeader>
      <DialogTitle>تفاصيل الحجز</DialogTitle>
    </DialogHeader>
    {selectedBookingInfo && (
      <div className="space-y-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-stone-500 text-sm">اسم الضيف</span>
          <span className="font-semibold text-stone-800">{selectedBookingInfo.guest_name}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-stone-500 text-sm">رقم الهاتف</span>
          {selectedBookingInfo.phone ? (
            <a
              href={`https://wa.me/${selectedBookingInfo.phone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:underline"
            >
              {selectedBookingInfo.phone}
            </a>
          ) : (
            <span className="text-stone-400">—</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-stone-500 text-sm">من</span>
          <span className="text-stone-800">{formatDate(selectedBookingInfo.check_in)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-stone-500 text-sm">إلى</span>
          <span className="text-stone-800">{formatDate(selectedBookingInfo.check_out)}</span>
        </div>
        <div className="flex items-center justify-between">
  <span className="text-stone-500 text-sm">السعر</span>
  <span className="font-semibold text-stone-800">
    {selectedBookingInfo.price ? `${selectedBookingInfo.price} ر.س` : "—"}
  </span>
</div><div className="flex items-center justify-between">
          <span className="text-stone-500 text-sm">الحالة</span>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              selectedBookingInfo.status === "available"
                ? "bg-green-100 text-green-800"
                : selectedBookingInfo.status === "pending"
                ? "bg-amber-100 text-amber-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {getStatusLabel(selectedBookingInfo.status)}
          </span>
        </div>
      </div>
    )}
    <DialogFooter className="gap-2 flex-wrap">
      <Button
        variant="outline"
        className="text-stone-600 hover:text-stone-700 hover:bg-stone-100"
        onClick={() => {
          if (selectedBookingInfo) {
            handleAddSecondBooking(selectedBookingInfo.check_in)
            setShowBookingInfoDialog(false)
          }
        }}
      >
        <Plus className="w-4 h-4" />
        إضافة حجز ثاني لنفس اليوم
      </Button>
      <Button
        variant="outline"
        className="text-green-600 hover:text-green-700 hover:bg-green-50"
        onClick={() => {
          if (selectedBookingInfo) {
            handleCopyConfirmation(selectedBookingInfo)
          }
        }}
      >
        <ClipboardCopy className="w-4 h-4" />
        {confirmationCopied ? "تم النسخ ✓" : "نسخ رسالة التأكيد"}
      </Button>
      <Button
        variant="outline"
        className="text-red-600 hover:text-red-700 hover:bg-red-50"
        onClick={() => {
          if (selectedBookingInfo) {
            handleDeleteBooking(selectedBookingInfo.id)
            setShowBookingInfoDialog(false)
          }
        }}
      >
        <Trash2 className="w-4 h-4" />
        حذف
      </Button>
      <Button
        className="bg-stone-800 hover:bg-stone-700"
        onClick={() => {
          if (selectedBookingInfo) {
            handleEditBooking(selectedBookingInfo)
            setShowBookingInfoDialog(false)
          }
        }}
      >
        <Edit className="w-4 h-4" />
        تعديل
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>{/* Facility Dialog */}
      <Dialog open={showFacilityDialog} onOpenChange={setShowFacilityDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingFacility ? "تعديل المرفق" : "إضافة مرفق جديد"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="facilityIcon">الأيقونة</Label>
              <Select
                value={facilityForm.icon}
                onValueChange={(value) => setFacilityForm({ ...facilityForm, icon: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر أيقونة" />
                </SelectTrigger>
                <SelectContent>
                  {availableIcons.map((icon) => (
                    <SelectItem key={icon.value} value={icon.value}>
                      <div className="flex items-center gap-2">
                        {icon.icon}
                        <span>{icon.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="facilityTitle">اسم المرفق</Label>
              <Input
                id="facilityTitle"
                value={facilityForm.title}
                onChange={(e) => setFacilityForm({ ...facilityForm, title: e.target.value })}
                placeholder="مثال: مسبح خاص"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowFacilityDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveFacility} disabled={saving} className="bg-stone-800 hover:bg-stone-700">
              {saving ? "جاري الحفظ..." : editingFacility ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}