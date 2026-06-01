"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight, MapPin, Users, BedDouble, CalendarCheck, Phone, Utensils, Coffee, Bath, Sofa, Waves, TreePalmIcon, ExternalLink, Wifi, Car, Snowflake, Flower2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

type BookingStatus = "available" | "pending" | "confirmed"

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

// Arabic day abbreviations (Saturday to Friday)
const arabicDays = ["س", "ح", "ن", "ث", "ر", "خ", "ج"]

// Icon mapping for facilities
const iconMap: { [key: string]: React.ReactNode } = {
  pool: <Waves className="w-8 h-8" />,
  bedroom: <BedDouble className="w-8 h-8" />,
  bathroom: <Bath className="w-8 h-8" />,
  kitchen: <Utensils className="w-8 h-8" />,
  wifi: <Wifi className="w-8 h-8" />,
  parking: <Car className="w-8 h-8" />,
  ac: <Snowflake className="w-8 h-8" />,
  garden: <Flower2 className="w-8 h-8" />,
  sofa: <Sofa className="w-8 h-8" />,
  coffee: <Coffee className="w-8 h-8" />,
  outdoor: <TreePalmIcon className="w-8 h-8" />,
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

export default function HomePage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dateStatuses, setDateStatuses] = useState<{ date: string; status: BookingStatus }[]>([])
  const [prices, setPrices] = useState<Price[]>([])
  const [content, setContent] = useState<SiteContent>({})
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const loadData = useCallback(async () => {
    try {
      const [dateStatusesRes, pricesRes, contentRes, facilitiesRes] = await Promise.all([
        supabase.from("date_statuses").select("*"),
        supabase.from("prices").select("*"),
        supabase.from("site_content").select("*"),
        supabase.from("facilities").select("*").order("sort_order"),
      ])

      if (dateStatusesRes.data) {
        setDateStatuses(dateStatusesRes.data.map(d => ({ date: d.date, status: d.status as BookingStatus })))
      }
      if (pricesRes.data) {
        setPrices(pricesRes.data)
      }
      if (contentRes.data) {
        const contentMap: SiteContent = {}
        contentRes.data.forEach(item => {
          contentMap[item.key] = item.value
        })
        setContent(contentMap)
      }
      if (facilitiesRes.data) {
        setFacilities(facilitiesRes.data)
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadData()

    const dateStatusesChannel = supabase
      .channel("date_statuses_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "date_statuses" }, () => {
        loadData()
      })
      .subscribe()

    const pricesChannel = supabase
      .channel("prices_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "prices" }, () => {
        loadData()
      })
      .subscribe()

    const contentChannel = supabase
      .channel("site_content_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_content" }, () => {
        loadData()
      })
      .subscribe()

    const facilitiesChannel = supabase
      .channel("facilities_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "facilities" }, () => {
        loadData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(dateStatusesChannel)
      supabase.removeChannel(pricesChannel)
      supabase.removeChannel(contentChannel)
      supabase.removeChannel(facilitiesChannel)
    }
  }, [loadData, supabase])

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

  const getDateStatus = (day: number): BookingStatus => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const found = dateStatuses.find((s) => s.date === dateStr)
    return found?.status || "available"
  }

  const isDatePast = (day: number): boolean => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return checkDate < today
  }

  const handleDateClick = (day: number) => {
    if (isDatePast(day)) return
    const status = getDateStatus(day)
    if (status === "confirmed") return
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    setSelectedDate(dateStr)
  }

  const formatSelectedDate = () => {
    if (!selectedDate) return "اختر تاريخاً للحجز"
    const date = new Date(selectedDate)
    return `${date.getDate()} ${arabicMonths[date.getMonth()]} ${date.getFullYear()}`
  }

  const handleWhatsAppBooking = () => {
    const message = selectedDate
      ? `مرحباً، أريد الحجز في تاريخ ${formatSelectedDate()}`
      : "مرحباً، أريد الاستفسار عن الحجز"
    const phone = content.contact_whatsapp || "966590444411"
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank")
  }

  const getPrice = (type: string): number => {
    const price = prices.find(p => p.type === type)
    return price?.amount || 0
  }

  const chaletName = content.chalet_name || "Madeira Sands"
  const whatsappNumber = content.contact_whatsapp || "966590444411"

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-stone-800 flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 animate-pulse">
            MS
          </div>
          <p className="text-stone-500">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="min-h-screen bg-white font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-stone-800 flex items-center justify-center text-white font-bold text-sm">
              MS
            </div>
            <span className="font-semibold text-stone-800 hidden sm:block">{chaletName}</span>
          </Link>
          <div className="flex items-center gap-4 text-sm text-stone-600">
            <a href="#booking" className="hover:text-stone-900 transition-colors">الحجز</a>
            <a href="#facilities" className="hover:text-stone-900 transition-colors">المرافق</a>
            <a href="#pricing" className="hover:text-stone-900 transition-colors">الأسعار</a>
            <a href="#location" className="hover:text-stone-900 transition-colors">الموقع</a>
            <a href="#social" className="hover:text-stone-900 transition-colors">تابعنا</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-[70vh] min-h-[500px] flex items-center justify-center">
        <Image
          src="/hero.jpg"
          alt={`شاليه ${chaletName}`}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">{chaletName}</h1>
          <p className="text-lg md:text-xl mb-2 opacity-90">
            {content.hero_title || "ملاذ صيفي فاخر"} … {content.hero_subtitle || "أجواء استجمام استثنائية"}
          </p>
          <div className="flex items-center justify-center gap-2 text-sm opacity-80 mb-6">
            <MapPin className="w-4 h-4" />
            <span>{content.hero_location || "القصيم - بريدة"}</span>
          </div>
          <Button
            onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })}
            className="bg-white text-stone-800 hover:bg-stone-100 px-8 py-6 text-lg rounded-full"
          >
            {content.hero_button || "احجز الآن"}
          </Button>
        </div>
        {/* WhatsApp floating button */}
        <a
          href={`https://wa.me/${whatsappNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 left-6 z-50 w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
      </section>

      {/* Booking Section */}
      <section id="booking" className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-stone-800 mb-2">احجز إقامتك</h2>
          <p className="text-center text-stone-500 mb-8">اختر التاريخ المناسب لك وتواصل معنا عبر الواتساب</p>

          <Card className="p-6 shadow-lg border-stone-100">
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
                const status = getDateStatus(day)
                const isPast = isDatePast(day)
                const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                const isSelected = selectedDate === dateStr

                return (
                  <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    disabled={isPast || status === "confirmed"}
                    className={`
                      aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all
                      ${isPast ? "text-stone-300 cursor-not-allowed bg-stone-50" : ""}
                      ${isSelected ? "ring-2 ring-stone-800 bg-stone-800 text-white" : ""}
                      ${!isPast && !isSelected && status === "available" ? "bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer" : ""}
                      ${!isPast && !isSelected && status === "pending" ? "bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer" : ""}
                      ${!isPast && !isSelected && status === "confirmed" ? "bg-red-100 text-red-800 cursor-not-allowed" : ""}
                    `}
                  >
                    {day}
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

            {/* Selected Date Display */}
            <div className="mt-6 text-center">
              <p className="text-stone-600 mb-4">{formatSelectedDate()}</p>
              <Button
                onClick={handleWhatsAppBooking}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-6 rounded-full text-lg flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                احجز عبر الواتساب
              </Button>
            </div>
          </Card>

          {/* Quick Info Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <Card className="p-4 text-center border-stone-100">
              <MapPin className="w-6 h-6 mx-auto mb-2 text-stone-600" />
              <p className="text-sm text-stone-600">{content.hero_location || "القصيم - بريدة"}</p>
            </Card>
            <Card className="p-4 text-center border-stone-100">
              <BedDouble className="w-6 h-6 mx-auto mb-2 text-stone-600" />
              <p className="text-sm text-stone-600">غرفة نوم</p>
            </Card>
            <Card className="p-4 text-center border-stone-100">
              <Users className="w-6 h-6 mx-auto mb-2 text-stone-600" />
              <p className="text-sm text-stone-600">10-15 شخص</p>
            </Card>
            <Card className="p-4 text-center border-stone-100">
              <CalendarCheck className="w-6 h-6 mx-auto mb-2 text-stone-600" />
              <p className="text-sm text-stone-600">حجز مرن</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Facilities Section */}
      <section id="facilities" className="py-16 px-4 bg-stone-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-stone-800 mb-2">
            {content.facilities_title || "المرافق والخدمات"}
          </h2>
          <p className="text-center text-stone-500 mb-10">
            {content.facilities_subtitle || "كل ما تحتاجه لإقامة مثالية"}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {facilities.length > 0 ? (
              facilities.map((facility) => (
                <Card key={facility.id} className="p-6 text-center border-stone-100 bg-white hover:shadow-md transition-shadow">
                  <div className="text-stone-700 mx-auto mb-3 flex justify-center">
                    {iconMap[facility.icon] || <Waves className="w-8 h-8" />}
                  </div>
                  <p className="text-sm text-stone-600">{facility.title}</p>
                </Card>
              ))
            ) : (
              <>
                <Card className="p-6 text-center border-stone-100 bg-white hover:shadow-md transition-shadow">
                  <Sofa className="w-8 h-8 mx-auto mb-3 text-stone-700" />
                  <p className="text-sm text-stone-600">صالة تتسع من 10 إلى 15 شخص</p>
                </Card>
                <Card className="p-6 text-center border-stone-100 bg-white hover:shadow-md transition-shadow">
                  <TreePalmIcon className="w-8 h-8 mx-auto mb-3 text-stone-700" />
                  <p className="text-sm text-stone-600">مجلس خارجي</p>
                </Card>
                <Card className="p-6 text-center border-stone-100 bg-white hover:shadow-md transition-shadow">
                  <BedDouble className="w-8 h-8 mx-auto mb-3 text-stone-700" />
                  <p className="text-sm text-stone-600">غرفة نوم</p>
                </Card>
                <Card className="p-6 text-center border-stone-100 bg-white hover:shadow-md transition-shadow">
                  <Bath className="w-8 h-8 mx-auto mb-3 text-stone-700" />
                  <p className="text-sm text-stone-600">2 دورات مياه</p>
                </Card>
                <Card className="p-6 text-center border-stone-100 bg-white hover:shadow-md transition-shadow">
                  <Utensils className="w-8 h-8 mx-auto mb-3 text-stone-700" />
                  <p className="text-sm text-stone-600">مطبخ</p>
                </Card>
                <Card className="p-6 text-center border-stone-100 bg-white hover:shadow-md transition-shadow">
                  <Coffee className="w-8 h-8 mx-auto mb-3 text-stone-700" />
                  <p className="text-sm text-stone-600">ركن قهوة</p>
                </Card>
                <Card className="p-6 text-center border-stone-100 bg-white hover:shadow-md transition-shadow col-span-2 md:col-span-2">
                  <Waves className="w-8 h-8 mx-auto mb-3 text-stone-700" />
                  <p className="text-sm text-stone-600">مسبح</p>
                </Card>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-stone-800 mb-2">
            {content.pricing_title || "الأسعار"}
          </h2>
          <p className="text-center text-stone-500 mb-10">
            {content.pricing_subtitle || "أسعار تنافسية لإقامة مميزة"}
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-8 text-center border-stone-200 bg-white">
              <h3 className="text-xl font-semibold text-stone-800 mb-2">أيام الأسبوع</h3>
              <p className="text-stone-500 text-sm mb-4">السبت - الأربعاء</p>
              <div className="text-4xl font-bold text-stone-800">
                {getPrice("weekday")}
                <span className="text-lg font-normal text-stone-500 mr-2">ر.س / الليلة</span>
              </div>
            </Card>
            <Card className="p-8 text-center border-amber-200 bg-amber-50 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-amber-600 text-white text-xs px-3 py-1 rounded-bl-lg">
                نهاية الأسبوع والعطلات
              </div>
              <h3 className="text-xl font-semibold text-stone-800 mb-2 mt-4">الخميس والجمعة</h3>
              <p className="text-stone-500 text-sm mb-4">والعطلات الرسمية</p>
              <div className="text-4xl font-bold text-amber-700">
                {getPrice("weekend")}
                <span className="text-lg font-normal text-stone-500 mr-2">ر.س / الليلة</span>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Section */}
      <section id="social" className="py-16 px-4 bg-stone-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-2">تابعنا</h2>
          <p className="text-stone-400 mb-8">شاهد المزيد من صور وفيديوهات الشاليه</p>

          <div className="grid md:grid-cols-2 gap-4 max-w-xl mx-auto">
            <a
              href={content.contact_instagram || "https://instagram.com/chaletmadeira"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white hover:opacity-90 transition-opacity"
            >
              <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <div className="text-right">
                <p className="font-semibold">Instagram</p>
                <p className="text-sm opacity-80">صور وقصص يومية</p>
              </div>
              <ExternalLink className="w-5 h-5 mr-auto" />
            </a>
            <a
              href={content.contact_tiktok || "https://tiktok.com/@chaletmadeira"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 bg-black rounded-xl text-white hover:opacity-90 transition-opacity"
            >
              <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
              </svg>
              <div className="text-right">
                <p className="font-semibold">TikTok</p>
                <p className="text-sm opacity-80">فيديوهات قصيرة</p>
              </div>
              <ExternalLink className="w-5 h-5 mr-auto" />
            </a>
          </div>
        </div>
      </section>

      {/* Location Section */}
      <section id="location" className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-stone-800 mb-2">
            {content.location_title || "الموقع"}
          </h2>
          <p className="text-center text-stone-500 mb-10">
            {content.location_address || "بريدة، القصيم، المملكة العربية السعودية"}
          </p>

          <Card className="overflow-hidden border-stone-200">
            <div className="aspect-video w-full">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3577.9574725968584!2d43.898048!3d26.3773229!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x157f0f14bef47285%3A0x46e82f01cee3e15f!2z2KjYsdmK2K_YqdiMINin2YTZhdmF2YTZg9ipINin2YTYudix2KjZitipINin2YTYs9i52YjYr9mK2Kk!5e0!3m2!1sar!2s!4v1704067200000!5m2!1sar!2s"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="موقع الشاليه"
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-stone-600">
                <MapPin className="w-5 h-5" />
                <span>{content.location_address || "بريدة، القصيم"}</span>
              </div>
              <a
                href="https://maps.app.goo.gl/sXKLpLFcUZBQeti78?g_st=iw"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
              >
                <span>فتح في خرائط Google</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center font-bold">
                MS
              </div>
              <div>
                <h3 className="font-semibold">{chaletName}</h3>
                <p className="text-sm text-stone-400">{content.hero_location || "القصيم - بريدة"}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-full transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>تواصل معنا</span>
              </a>
            </div>
          </div>

          <div className="border-t border-stone-800 mt-8 pt-8 text-center text-sm text-stone-500">
            <p>© {new Date().getFullYear()} {chaletName}. {content.footer_rights || "جميع الحقوق محفوظة"}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
