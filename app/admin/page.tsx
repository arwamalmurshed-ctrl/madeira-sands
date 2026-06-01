"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  ChevronLeft, ChevronRight, Plus, Trash2, Edit, LogOut, Calendar, DollarSign, 
  List, Save, X, FileText, Settings, Wifi, Car, Snowflake, Flower2,
  Waves, BedDouble, Bath, Utensils, Coffee, Sofa, TreePalmIcon, GripVertical
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
  const [activeTab, setActiveTab] = useState<"calendar" | "bookings" | "prices" | "content" | "facilities">("calendar")
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
  })
  
  // Prices state
  const [prices, setPrices] = useState<Price[]>([])
  const [pricesChanged, setPricesChanged] = useState(false)

  // Content state
  const [content, setContent] = useState<SiteContent>({})
  const [contentChanged, setContentChanged] = useState(false)

  // Facilities state
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [showFacilityDialog, setShowFacilityDialog] = useState(false)
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null)
  const [facilityForm, setFacilityForm] = useState({
    icon: "pool",
    title: "",
  })

  const supabase = createClient()

  // Check if already authenticated
  useEffect(() => {
    const auth = sessionStorage.getItem("madeira_admin_auth")
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
      sessionStorage.setItem("madeira_admin_auth", "true")
      setPasswordError(false)
    } else {
      setPasswordError(true)
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    sessionStorage.removeItem("madeira_admin_auth")
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

  const handleAddBooking = () => {
    setEditingBooking(null)
    setBookingForm({
      guest_name: "",
      phone: "",
      check_in: "",
      check_out: "",
      status: "pending",
    })
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
    })
    setShowBookingDialog(true)
  }

  const handleSaveBooking = async () => {
    if (!bookingForm.guest_name || !bookingForm.phone || !bookingForm.check_in || !bookingForm.check_out) {
      return
    }

    setSaving(true)
    try {
      if (editingBooking) {
        await supabase.from("bookings").update({
          guest_name: bookingForm.guest_name,
          phone: bookingForm.phone,
          check_in: bookingForm.check_in,
          check_out: bookingForm.check_out,
          status: bookingForm.status,
          updated_at: new Date().toISOString(),
        }).eq("id", editingBooking.id)
      } else {
        await supabase.from("bookings").insert({
          guest_name: bookingForm.guest_name,
          phone: bookingForm.phone,
          check_in: bookingForm.check_in,
          check_out: bookingForm.check_out,
          status: bookingForm.status,
        })
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
      setShowBookingDialog(false)
    } catch (error) {
      console.error("Error saving booking:", error)
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
        {/* Calendar Tab */}
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-stone-800">قائمة الحجوزات</h2>
              <Button onClick={handleAddBooking} className="gap-2 bg-stone-800 hover:bg-stone-700">
                <Plus className="w-4 h-4" />
                إضافة حجز
              </Button>
            </div>

            {bookings.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-stone-500">لا توجد حجوزات حالياً</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <Card key={booking.id} className="p-4">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-stone-800">{booking.guest_name}</h3>
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
                        <p className="text-sm text-stone-500">{booking.phone}</p>
                        <div className="flex items-center gap-4 text-sm text-stone-600">
                          <span>من: {formatDate(booking.check_in)}</span>
                          <span>إلى: {formatDate(booking.check_out)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditBooking(booking)}
                          className="gap-1"
                        >
                          <Edit className="w-4 h-4" />
                          تعديل
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteBooking(booking.id)}
                          className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          حذف
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
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
                  onChange={(e) => setBookingForm({ ...bookingForm, check_in: e.target.value })}
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

      {/* Facility Dialog */}
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
