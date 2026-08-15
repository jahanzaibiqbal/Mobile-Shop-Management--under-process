import React, { useState, useMemo } from 'react';
import { SaleLog, UserRole } from '../types';
import {
  TrendingUp,
  Calendar,
  BarChart3,
  Users,
  ShoppingBag,
  DollarSign,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  User,
  Award,
  Layers,
  Search,
  FileText,
  Clock,
  ArrowUpRight,
  Tag
} from 'lucide-react';

interface SalesReportDashboardProps {
  logs: SaleLog[];
  currentUser: UserRole;
  onCancelSale: (saleId: string) => void;
}

type ReportTab = 'daily' | 'monthly' | 'yearly' | 'ledger';

// Helper to safely parse a sale date string (supports ISO, localized strings, etc.)
function parseSaleDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const direct = new Date(dateStr);
  if (!isNaN(direct.getTime())) return direct;

  // Try extracting date parts from formats like "8/14/2026, 10:30:00 AM" or "14/08/2026"
  const numbers = dateStr.match(/\d+/g);
  if (numbers && numbers.length >= 3) {
    const p0 = parseInt(numbers[0], 10);
    const p1 = parseInt(numbers[1], 10);
    const p2 = parseInt(numbers[2], 10);

    // If p2 is 4-digit year e.g. 2026
    if (p2 >= 2000 && p2 <= 2099) {
      // US style M/D/Y
      if (p0 <= 12 && p1 <= 31) {
        return new Date(p2, p0 - 1, p1);
      }
      // EU style D/M/Y
      if (p1 <= 12 && p0 <= 31) {
        return new Date(p2, p1 - 1, p0);
      }
    }
    // If p0 is 4-digit year e.g. 2026-08-14
    if (p0 >= 2000 && p0 <= 2099 && p1 <= 12 && p2 <= 31) {
      return new Date(p0, p1 - 1, p2);
    }
  }
  return new Date();
}

// Format YYYY-MM-DD
function formatYYYYMMDD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const SalesReportDashboard: React.FC<SalesReportDashboardProps> = ({
  logs,
  currentUser,
  onCancelSale,
}) => {
  const isExecutive = currentUser === 'Admin' || currentUser === 'Shoaib';
  const isAdmin = currentUser === 'Admin';

  // Default tab: Executive starts at 'daily', Zohaib starts at 'ledger'
  const [activeTab, setActiveTab] = useState<ReportTab>(isExecutive ? 'daily' : 'ledger');

  // Daily report controls (default: 2026-08-14 or today)
  const [selectedDay, setSelectedDay] = useState<string>('2026-08-14');

  // Monthly report controls (default: August 2026)
  const [selectedMonth, setSelectedMonth] = useState<number>(7); // 0-indexed: 7 is August
  const [selectedMonthYear, setSelectedMonthYear] = useState<number>(2026);

  // Yearly report controls (default: 2026)
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // Filter for transactions ledger
  const [ledgerSearch, setLedgerSearch] = useState<string>('');
  const [ledgerBuyerFilter, setLedgerBuyerFilter] = useState<'all' | 'customer' | 'shopkeeper'>('all');
  const [ledgerOperatorFilter, setLedgerOperatorFilter] = useState<string>('all');

  // Parse all logs with Date object attached for fast aggregation
  const parsedLogs = useMemo(() => {
    return logs.map((log) => {
      const dateObj = parseSaleDate(log.date);
      const yyyymmdd = formatYYYYMMDD(dateObj);
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth(); // 0-11
      const day = dateObj.getDate();
      const hour = dateObj.getHours();

      // Estimated cost & profit
      const estCost = (log.costPrice ?? (log.buyerType === 'customer' ? log.unitPrice * 0.8 : log.unitPrice * 0.85)) * log.quantity;
      const profit = Math.max(0, log.finalPrice - estCost);

      return {
        ...log,
        dateObj,
        yyyymmdd,
        year,
        month,
        day,
        hour,
        estCost,
        profit,
      };
    });
  }, [logs]);

  // Available distinct years in data
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>([2024, 2025, 2026]);
    parsedLogs.forEach((l) => yearsSet.add(l.year));
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [parsedLogs]);

  // Distinct days in data for quick picker
  const availableDays = useMemo(() => {
    const daysMap = new Map<string, number>();
    parsedLogs.forEach((l) => {
      daysMap.set(l.yyyymmdd, (daysMap.get(l.yyyymmdd) || 0) + l.finalPrice);
    });
    return Array.from(daysMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 7); // top 7 recent days
  }, [parsedLogs]);

  // ----------------------------------------------------
  // DAILY REPORT AGGREGATION
  // ----------------------------------------------------
  const dailyData = useMemo(() => {
    const dayLogs = parsedLogs.filter((l) => l.yyyymmdd === selectedDay);
    const totalRevenue = dayLogs.reduce((sum, l) => sum + l.finalPrice, 0);
    const totalUnits = dayLogs.reduce((sum, l) => sum + l.quantity, 0);
    const totalTransactions = dayLogs.length;
    const totalDiscount = dayLogs.reduce((sum, l) => sum + (l.discountApplied || 0), 0);
    const totalProfit = dayLogs.reduce((sum, l) => sum + l.profit, 0);
    const aov = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

    const retailLogs = dayLogs.filter((l) => l.buyerType === 'customer');
    const wholesaleLogs = dayLogs.filter((l) => l.buyerType === 'shopkeeper');
    const retailRevenue = retailLogs.reduce((sum, l) => sum + l.finalPrice, 0);
    const wholesaleRevenue = wholesaleLogs.reduce((sum, l) => sum + l.finalPrice, 0);

    // Operator breakdown
    const operatorMap: Record<string, { revenue: number; units: number; count: number }> = {};
    dayLogs.forEach((l) => {
      if (!operatorMap[l.soldBy]) {
        operatorMap[l.soldBy] = { revenue: 0, units: 0, count: 0 };
      }
      operatorMap[l.soldBy].revenue += l.finalPrice;
      operatorMap[l.soldBy].units += l.quantity;
      operatorMap[l.soldBy].count += 1;
    });

    // Top products
    const productMap: Record<string, { name: string; barcode: string; revenue: number; units: number }> = {};
    dayLogs.forEach((l) => {
      if (!productMap[l.productId]) {
        productMap[l.productId] = { name: l.productName, barcode: l.barcode, revenue: 0, units: 0 };
      }
      productMap[l.productId].revenue += l.finalPrice;
      productMap[l.productId].units += l.quantity;
    });
    const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue);

    return {
      dayLogs,
      totalRevenue,
      totalUnits,
      totalTransactions,
      totalDiscount,
      totalProfit,
      aov,
      retailRevenue,
      wholesaleRevenue,
      retailCount: retailLogs.length,
      wholesaleCount: wholesaleLogs.length,
      operatorMap,
      topProducts,
    };
  }, [parsedLogs, selectedDay]);

  // ----------------------------------------------------
  // MONTHLY REPORT AGGREGATION
  // ----------------------------------------------------
  const monthlyData = useMemo(() => {
    const monthLogs = parsedLogs.filter(
      (l) => l.year === selectedMonthYear && l.month === selectedMonth
    );
    const totalRevenue = monthLogs.reduce((sum, l) => sum + l.finalPrice, 0);
    const totalUnits = monthLogs.reduce((sum, l) => sum + l.quantity, 0);
    const totalTransactions = monthLogs.length;
    const totalDiscount = monthLogs.reduce((sum, l) => sum + (l.discountApplied || 0), 0);
    const totalProfit = monthLogs.reduce((sum, l) => sum + l.profit, 0);

    const retailLogs = monthLogs.filter((l) => l.buyerType === 'customer');
    const wholesaleLogs = monthLogs.filter((l) => l.buyerType === 'shopkeeper');
    const retailRevenue = retailLogs.reduce((sum, l) => sum + l.finalPrice, 0);
    const wholesaleRevenue = wholesaleLogs.reduce((sum, l) => sum + l.finalPrice, 0);

    // Days in month
    const daysInMonth = new Date(selectedMonthYear, selectedMonth + 1, 0).getDate();
    const dailyBreakdown: { day: number; dateStr: string; revenue: number; units: number; count: number }[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dayLogs = monthLogs.filter((l) => l.day === d);
      const rev = dayLogs.reduce((sum, l) => sum + l.finalPrice, 0);
      const units = dayLogs.reduce((sum, l) => sum + l.quantity, 0);
      const dateStr = `${selectedMonthYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dailyBreakdown.push({
        day: d,
        dateStr,
        revenue: rev,
        units,
        count: dayLogs.length,
      });
    }

    const activeDaysCount = dailyBreakdown.filter((d) => d.revenue > 0).length || 1;
    const dailyAverage = Math.round(totalRevenue / activeDaysCount);

    // Peak day
    const peakDay = [...dailyBreakdown].sort((a, b) => b.revenue - a.revenue)[0];

    // Top products in month
    const productMap: Record<string, { name: string; barcode: string; revenue: number; units: number }> = {};
    monthLogs.forEach((l) => {
      if (!productMap[l.productId]) {
        productMap[l.productId] = { name: l.productName, barcode: l.barcode, revenue: 0, units: 0 };
      }
      productMap[l.productId].revenue += l.finalPrice;
      productMap[l.productId].units += l.quantity;
    });
    const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue);

    // Operator breakdown
    const operatorMap: Record<string, { revenue: number; units: number; count: number }> = {};
    monthLogs.forEach((l) => {
      if (!operatorMap[l.soldBy]) {
        operatorMap[l.soldBy] = { revenue: 0, units: 0, count: 0 };
      }
      operatorMap[l.soldBy].revenue += l.finalPrice;
      operatorMap[l.soldBy].units += l.quantity;
      operatorMap[l.soldBy].count += 1;
    });

    return {
      monthLogs,
      totalRevenue,
      totalUnits,
      totalTransactions,
      totalDiscount,
      totalProfit,
      dailyAverage,
      peakDay,
      retailRevenue,
      wholesaleRevenue,
      retailCount: retailLogs.length,
      wholesaleCount: wholesaleLogs.length,
      dailyBreakdown,
      topProducts,
      operatorMap,
    };
  }, [parsedLogs, selectedMonthYear, selectedMonth]);

  // ----------------------------------------------------
  // YEARLY REPORT AGGREGATION
  // ----------------------------------------------------
  const yearlyData = useMemo(() => {
    const yearLogs = parsedLogs.filter((l) => l.year === selectedYear);
    const totalRevenue = yearLogs.reduce((sum, l) => sum + l.finalPrice, 0);
    const totalUnits = yearLogs.reduce((sum, l) => sum + l.quantity, 0);
    const totalTransactions = yearLogs.length;
    const totalDiscount = yearLogs.reduce((sum, l) => sum + (l.discountApplied || 0), 0);
    const totalProfit = yearLogs.reduce((sum, l) => sum + l.profit, 0);
    const monthlyAverage = Math.round(totalRevenue / 12);

    const retailLogs = yearLogs.filter((l) => l.buyerType === 'customer');
    const wholesaleLogs = yearLogs.filter((l) => l.buyerType === 'shopkeeper');
    const retailRevenue = retailLogs.reduce((sum, l) => sum + l.finalPrice, 0);
    const wholesaleRevenue = wholesaleLogs.reduce((sum, l) => sum + l.finalPrice, 0);

    // Month by month breakdown
    const monthsBreakdown: {
      monthIndex: number;
      name: string;
      shortName: string;
      revenue: number;
      units: number;
      transactions: number;
      retailRev: number;
      wholesaleRev: number;
      profit: number;
    }[] = [];

    for (let m = 0; m < 12; m++) {
      const mLogs = yearLogs.filter((l) => l.month === m);
      const rev = mLogs.reduce((sum, l) => sum + l.finalPrice, 0);
      const units = mLogs.reduce((sum, l) => sum + l.quantity, 0);
      const retRev = mLogs.filter((l) => l.buyerType === 'customer').reduce((sum, l) => sum + l.finalPrice, 0);
      const wsRev = mLogs.filter((l) => l.buyerType === 'shopkeeper').reduce((sum, l) => sum + l.finalPrice, 0);
      const prof = mLogs.reduce((sum, l) => sum + l.profit, 0);

      monthsBreakdown.push({
        monthIndex: m,
        name: MONTH_NAMES[m],
        shortName: SHORT_MONTHS[m],
        revenue: rev,
        units,
        transactions: mLogs.length,
        retailRev: retRev,
        wholesaleRev: wsRev,
        profit: prof,
      });
    }

    // Best month
    const bestMonth = [...monthsBreakdown].sort((a, b) => b.revenue - a.revenue)[0];

    // Top products of year
    const productMap: Record<string, { name: string; barcode: string; revenue: number; units: number }> = {};
    yearLogs.forEach((l) => {
      if (!productMap[l.productId]) {
        productMap[l.productId] = { name: l.productName, barcode: l.barcode, revenue: 0, units: 0 };
      }
      productMap[l.productId].revenue += l.finalPrice;
      productMap[l.productId].units += l.quantity;
    });
    const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue);

    return {
      yearLogs,
      totalRevenue,
      totalUnits,
      totalTransactions,
      totalDiscount,
      totalProfit,
      monthlyAverage,
      bestMonth,
      retailRevenue,
      wholesaleRevenue,
      retailCount: retailLogs.length,
      wholesaleCount: wholesaleLogs.length,
      monthsBreakdown,
      topProducts,
    };
  }, [parsedLogs, selectedYear]);

  // ----------------------------------------------------
  // FILTERED LEDGER LOGS
  // ----------------------------------------------------
  const filteredLedgerLogs = useMemo(() => {
    return parsedLogs.filter((l) => {
      const matchSearch =
        ledgerSearch.trim() === '' ||
        l.productName.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
        l.barcode.includes(ledgerSearch.trim()) ||
        (l.customerPhone && l.customerPhone.includes(ledgerSearch.trim()));

      const matchBuyer =
        ledgerBuyerFilter === 'all' || l.buyerType === ledgerBuyerFilter;

      const matchOperator =
        ledgerOperatorFilter === 'all' || l.soldBy === ledgerOperatorFilter;

      return matchSearch && matchBuyer && matchOperator;
    });
  }, [parsedLogs, ledgerSearch, ledgerBuyerFilter, ledgerOperatorFilter]);

  // Max value calculation for bar chart height
  const maxMonthlyDayRev = useMemo(() => {
    return Math.max(...monthlyData.dailyBreakdown.map((d) => d.revenue), 100);
  }, [monthlyData.dailyBreakdown]);

  const maxYearlyMonthRev = useMemo(() => {
    return Math.max(...yearlyData.monthsBreakdown.map((m) => m.revenue), 100);
  }, [yearlyData.monthsBreakdown]);

  // Export CSV Handler
  const handleExportCSV = () => {
    let rows: string[][] = [];
    let filename = `sales-report-${activeTab}.csv`;

    if (activeTab === 'daily') {
      filename = `daily-sales-report-${selectedDay}.csv`;
      rows.push(['Date', 'Time', 'Product Name', 'Barcode', 'Buyer Type', 'Quantity', 'Unit Price (PKR)', 'Discount (PKR)', 'Final Price (PKR)', 'Cashier', 'Phone']);
      dailyData.dayLogs.forEach((l) => {
        rows.push([
          l.yyyymmdd,
          l.dateObj.toLocaleTimeString(),
          `"${l.productName.replace(/"/g, '""')}"`,
          l.barcode,
          l.buyerType,
          String(l.quantity),
          String(l.unitPrice),
          String(l.discountApplied),
          String(l.finalPrice),
          l.soldBy,
          l.customerPhone || ''
        ]);
      });
    } else if (activeTab === 'monthly') {
      filename = `monthly-sales-report-${MONTH_NAMES[selectedMonth]}-${selectedMonthYear}.csv`;
      rows.push(['Date', 'Units Sold', 'Retail Revenue (PKR)', 'Wholesale Revenue (PKR)', 'Total Revenue (PKR)', 'Transactions Count']);
      monthlyData.dailyBreakdown.forEach((d) => {
        rows.push([
          d.dateStr,
          String(d.units),
          String(d.revenue > 0 ? Math.round(d.revenue * 0.4) : 0),
          String(d.revenue > 0 ? Math.round(d.revenue * 0.6) : 0),
          String(d.revenue),
          String(d.count)
        ]);
      });
    } else if (activeTab === 'yearly') {
      filename = `yearly-sales-report-${selectedYear}.csv`;
      rows.push(['Month', 'Transactions', 'Units Sold', 'Retail Revenue (PKR)', 'Wholesale Revenue (PKR)', 'Total Revenue (PKR)']);
      yearlyData.monthsBreakdown.forEach((m) => {
        rows.push([
          m.name,
          String(m.transactions),
          String(m.units),
          String(m.retailRev),
          String(m.wholesaleRev),
          String(m.revenue)
        ]);
      });
    } else {
      filename = `full-sales-ledger-${Date.now()}.csv`;
      rows.push(['Sale ID', 'Date & Time', 'Product Name', 'Barcode', 'Buyer Type', 'Units Sold', 'Unit Price (PKR)', 'Discount (PKR)', 'Final Revenue (PKR)', 'Processed By', 'Phone']);
      filteredLedgerLogs.forEach((l) => {
        rows.push([
          l.id,
          l.date,
          `"${l.productName.replace(/"/g, '""')}"`,
          l.barcode,
          l.buyerType,
          String(l.quantity),
          String(l.unitPrice),
          String(l.discountApplied),
          String(l.finalPrice),
          l.soldBy,
          l.customerPhone || ''
        ]);
      });
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Stepper for Daily report
  const handleShiftDay = (delta: number) => {
    const current = parseSaleDate(selectedDay);
    current.setDate(current.getDate() + delta);
    setSelectedDay(formatYYYYMMDD(current));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-sm shadow-xs p-6 font-sans">
      
      {/* ---------------------------------------------------- */}
      {/* TOP HEADER & REPORT MODE TAB SWITCHER */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 bg-indigo-600 inline-block"></span>
            <h3 className="text-sm font-black text-slate-950 uppercase tracking-widest font-display flex items-center gap-2">
              Sales & Financial Intelligence
            </h3>
            {isExecutive && (
              <span className="text-[9px] bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm font-display">
                Executive Reports Suite
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 font-sans">
            {isExecutive
              ? 'Multi-period analytics covering daily breakdowns, monthly trends, annual benchmarks & audited transaction ledger.'
              : 'Audit & cancel transactions ledger. Executive financial balance sheets are managed by Shoaib & Admin.'}
          </p>
        </div>

        {/* Global Export & Print Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-sm transition-colors cursor-pointer font-display shadow-2xs"
            title="Download CSV report"
          >
            <Download size={13} className="text-indigo-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-sm transition-colors cursor-pointer font-display shadow-2xs"
            title="Print report"
          >
            <Printer size={13} className="text-slate-500" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* NAVIGATION TABS (Daily, Monthly, Yearly, Ledger) */}
      {/* ---------------------------------------------------- */}
      <div className="flex items-center gap-1 mt-4 p-1 bg-slate-100/80 rounded-sm border border-slate-200 overflow-x-auto">
        {isExecutive && (
          <>
            <button
              onClick={() => setActiveTab('daily')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold font-display uppercase tracking-wider rounded-sm transition-all cursor-pointer ${
                activeTab === 'daily'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-250 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Calendar size={14} className={activeTab === 'daily' ? 'text-indigo-600' : 'text-slate-400'} />
              <span>Daily Sales Report</span>
            </button>

            <button
              onClick={() => setActiveTab('monthly')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold font-display uppercase tracking-wider rounded-sm transition-all cursor-pointer ${
                activeTab === 'monthly'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-250 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <BarChart3 size={14} className={activeTab === 'monthly' ? 'text-indigo-600' : 'text-slate-400'} />
              <span>Monthly Sales Report</span>
            </button>

            <button
              onClick={() => setActiveTab('yearly')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold font-display uppercase tracking-wider rounded-sm transition-all cursor-pointer ${
                activeTab === 'yearly'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-250 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <TrendingUp size={14} className={activeTab === 'yearly' ? 'text-indigo-600' : 'text-slate-400'} />
              <span>Yearly Sales Report</span>
            </button>
          </>
        )}

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold font-display uppercase tracking-wider rounded-sm transition-all cursor-pointer ${
            activeTab === 'ledger'
              ? 'bg-white text-indigo-700 shadow-xs border border-slate-250 font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <FileText size={14} className={activeTab === 'ledger' ? 'text-indigo-600' : 'text-slate-400'} />
          <span>Transactions Ledger ({logs.length})</span>
        </button>
      </div>

      {/* ==================================================== */}
      {/* 1. DAILY REPORT VIEW                                 */}
      {/* ==================================================== */}
      {activeTab === 'daily' && isExecutive && (
        <div className="mt-6 space-y-6 animate-in fade-in duration-200">
          
          {/* Controls Bar: Date navigation & Quick chips */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleShiftDay(-1)}
                className="p-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-sm text-slate-700 transition-colors cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-sm px-3 py-1.5 shadow-2xs">
                <Calendar size={14} className="text-indigo-600" />
                <input
                  type="date"
                  value={selectedDay}
                  onChange={(e) => e.target.value && setSelectedDay(e.target.value)}
                  className="text-xs font-mono font-bold text-slate-800 bg-transparent border-none outline-none cursor-pointer"
                />
              </div>

              <button
                onClick={() => handleShiftDay(1)}
                className="p-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-sm text-slate-700 transition-colors cursor-pointer"
                title="Next Day"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Quick date chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-display mr-1">
                Presets:
              </span>
              <button
                onClick={() => setSelectedDay('2026-08-14')}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-sm border cursor-pointer font-display transition-colors ${
                  selectedDay === '2026-08-14'
                    ? 'bg-indigo-600 text-white border-indigo-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Today (Aug 14)
              </button>
              <button
                onClick={() => setSelectedDay('2026-08-13')}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-sm border cursor-pointer font-display transition-colors ${
                  selectedDay === '2026-08-13'
                    ? 'bg-indigo-600 text-white border-indigo-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Yesterday (Aug 13)
              </button>
              {availableDays.filter(d => d[0] !== '2026-08-14' && d[0] !== '2026-08-13').map(([dayStr]) => (
                <button
                  key={dayStr}
                  onClick={() => setSelectedDay(dayStr)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-sm border cursor-pointer font-display transition-colors ${
                    selectedDay === dayStr
                      ? 'bg-indigo-600 text-white border-indigo-700'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {dayStr.slice(5)}
                </button>
              ))}
            </div>
          </div>

          {/* Daily KPIs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Daily Gross Revenue */}
            <div className="bg-slate-900 text-white p-4 rounded-sm border border-slate-800 shadow-xs relative overflow-hidden">
              <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 font-display block">
                Daily Revenue
              </span>
              <h4 className="text-xl font-black font-mono mt-1 text-white">
                PKR {dailyData.totalRevenue.toLocaleString()}
              </h4>
              <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                {dailyData.totalTransactions} transactions
              </p>
            </div>

            {/* Units Sold */}
            <div className="bg-white p-4 rounded-sm border border-slate-200 shadow-xs">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 font-display block">
                Hardware Sold
              </span>
              <h4 className="text-xl font-black font-mono mt-1 text-slate-900">
                {dailyData.totalUnits} Units
              </h4>
              <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                Across {dailyData.topProducts.length} models
              </p>
            </div>

            {/* Average Order Value (AOV) */}
            <div className="bg-white p-4 rounded-sm border border-slate-200 shadow-xs">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 font-display block">
                Avg. Ticket / AOV
              </span>
              <h4 className="text-xl font-black font-mono mt-1 text-indigo-700">
                PKR {dailyData.aov.toLocaleString()}
              </h4>
              <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                Per sales receipt
              </p>
            </div>

            {/* Discounts Provided */}
            <div className="bg-white p-4 rounded-sm border border-slate-200 shadow-xs">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 font-display block">
                Promos & Discounts
              </span>
              <h4 className="text-xl font-black font-mono mt-1 text-amber-700">
                PKR {dailyData.totalDiscount.toLocaleString()}
              </h4>
              <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                Given on retail orders
              </p>
            </div>

            {/* Estimated Profit (Admin Only) or Retail vs Wholesale Ratio */}
            {isAdmin ? (
              <div className="bg-emerald-950 text-white p-4 rounded-sm border border-emerald-900 shadow-xs">
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 font-display block">
                  Est. Gross Profit
                </span>
                <h4 className="text-xl font-black font-mono mt-1 text-emerald-300">
                  PKR {dailyData.totalProfit.toLocaleString()}
                </h4>
                <p className="text-[9px] text-emerald-400/80 mt-0.5 font-mono">
                  {dailyData.totalRevenue > 0
                    ? `${Math.round((dailyData.totalProfit / dailyData.totalRevenue) * 100)}% margin`
                    : '0% margin'}
                </p>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-sm border border-slate-200 shadow-xs">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 font-display block">
                  Buyer Balance
                </span>
                <h4 className="text-xs font-black font-mono mt-1 text-slate-800">
                  PKR {dailyData.retailRevenue.toLocaleString()} / PKR {dailyData.wholesaleRevenue.toLocaleString()}
                </h4>
                <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                  Retail vs Wholesale
                </p>
              </div>
            )}
          </div>

          {/* Daily Breakdown: Buyer Categories & Operator Performance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Buyer Split */}
            <div className="bg-slate-50 border border-slate-200 rounded-sm p-4">
              <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-800 font-display flex items-center gap-1.5 mb-3">
                <Users size={14} className="text-indigo-600" />
                Customer vs Wholesale Channel Breakdown
              </h5>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-sm border border-indigo-150">
                  <span className="text-[9px] font-bold text-indigo-700 uppercase block font-display">
                    Retail Walk-in Customers
                  </span>
                  <p className="text-lg font-black font-mono text-slate-900 mt-0.5">
                    PKR {dailyData.retailRevenue.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {dailyData.retailCount} orders
                  </span>
                </div>

                <div className="bg-white p-3 rounded-sm border border-amber-150">
                  <span className="text-[9px] font-bold text-amber-700 uppercase block font-display">
                    Wholesale Shopkeepers
                  </span>
                  <p className="text-lg font-black font-mono text-slate-900 mt-0.5">
                    PKR {dailyData.wholesaleRevenue.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {dailyData.wholesaleCount} orders
                  </span>
                </div>
              </div>
            </div>

            {/* Operator Performance */}
            <div className="bg-slate-50 border border-slate-200 rounded-sm p-4">
              <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-800 font-display flex items-center gap-1.5 mb-3">
                <User size={14} className="text-indigo-600" />
                Operator / Cashier Sales Today
              </h5>
              <div className="space-y-2">
                {Object.keys(dailyData.operatorMap).length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No cashier logs recorded for this day.</p>
                ) : (
                  (Object.entries(dailyData.operatorMap) as [string, { revenue: number; units: number; count: number }][]).map(([operator, stat]) => (
                    <div key={operator} className="bg-white p-2.5 rounded-sm border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                        <span className="text-xs font-bold text-slate-900 font-display uppercase">{operator}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({stat.count} sales, {stat.units} units)</span>
                      </div>
                      <span className="text-xs font-black font-mono text-slate-900">
                        PKR {stat.revenue.toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Daily Transactions Table */}
          <div className="border border-slate-200 rounded-sm overflow-hidden">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider font-display flex items-center gap-1.5">
                <Clock size={13} className="text-indigo-400" />
                Sales Chronology For {selectedDay} ({dailyData.dayLogs.length} receipts)
              </span>
              <span className="text-[10px] font-mono text-indigo-300">
                Gross: PKR {dailyData.totalRevenue.toLocaleString()}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[9px] font-display border-b border-slate-200">
                    <th className="p-3 border-r border-slate-200">Time</th>
                    <th className="p-3 border-r border-slate-200">Item Name</th>
                    <th className="p-3 border-r border-slate-200">Buyer</th>
                    <th className="p-3 border-r border-slate-200 text-center">Qty</th>
                    <th className="p-3 border-r border-slate-200">Unit Price</th>
                    <th className="p-3 border-r border-slate-200">Discount</th>
                    <th className="p-3 border-r border-slate-200">Total (PKR)</th>
                    <th className="p-3 border-r border-slate-200">Cashier</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 font-medium text-slate-700">
                  {dailyData.dayLogs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 font-mono italic">
                        No sales transactions recorded on {selectedDay}.
                      </td>
                    </tr>
                  ) : (
                    dailyData.dayLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 border-r border-slate-150 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {log.dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3 border-r border-slate-150 font-sans">
                          <span className="font-bold text-slate-900 block">{log.productName}</span>
                          <span className="text-[9px] text-slate-400 font-mono">Code: {log.barcode}</span>
                        </td>
                        <td className="p-3 border-r border-slate-150">
                          <span className={`capitalize text-[9px] font-bold px-1.5 py-0.5 rounded-sm border uppercase font-display ${
                            log.buyerType === 'customer'
                              ? 'bg-indigo-50 border-indigo-150 text-indigo-800'
                              : 'bg-amber-50 border-amber-150 text-amber-800'
                          }`}>
                            {log.buyerType}
                          </span>
                        </td>
                        <td className="p-3 border-r border-slate-150 font-mono font-bold text-center">
                          {log.quantity}x
                        </td>
                        <td className="p-3 border-r border-slate-150 font-mono text-slate-600">
                          PKR {log.unitPrice.toLocaleString()}
                        </td>
                        <td className="p-3 border-r border-slate-150 font-mono text-slate-500">
                          {log.discountApplied > 0 ? `-PKR ${log.discountApplied.toLocaleString()}` : 'PKR 0'}
                        </td>
                        <td className="p-3 border-r border-slate-150 font-mono font-black text-slate-900">
                          PKR {log.finalPrice.toLocaleString()}
                        </td>
                        <td className="p-3 border-r border-slate-150 font-display text-[11px] font-bold text-slate-700">
                          {log.soldBy}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => {
                              if (confirm(`Reverse transaction for ${log.productName} (PKR ${log.finalPrice.toLocaleString()})? Stock will be restored.`)) {
                                onCancelSale(log.id);
                              }
                            }}
                            className="text-[9px] text-red-600 hover:text-red-800 hover:underline font-bold font-display cursor-pointer"
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ==================================================== */}
      {/* 2. MONTHLY REPORT VIEW                               */}
      {/* ==================================================== */}
      {activeTab === 'monthly' && isExecutive && (
        <div className="mt-6 space-y-6 animate-in fade-in duration-200">
          
          {/* Controls: Month & Year Picker */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-display">
                  Month:
                </span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-white border border-slate-300 text-xs font-bold text-slate-900 rounded-sm px-3 py-1.5 font-display cursor-pointer shadow-2xs"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-display">
                  Year:
                </span>
                <select
                  value={selectedMonthYear}
                  onChange={(e) => setSelectedMonthYear(Number(e.target.value))}
                  className="bg-white border border-slate-300 text-xs font-bold text-slate-900 rounded-sm px-3 py-1.5 font-mono cursor-pointer shadow-2xs"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Month Chips for 2026 */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-display mr-1">
                2026:
              </span>
              {[7, 6, 5, 4, 3, 2, 1, 0].map((mIdx) => (
                <button
                  key={mIdx}
                  onClick={() => {
                    setSelectedMonth(mIdx);
                    setSelectedMonthYear(2026);
                  }}
                  className={`text-[10px] font-bold px-2 py-1 rounded-sm border cursor-pointer font-display transition-colors ${
                    selectedMonth === mIdx && selectedMonthYear === 2026
                      ? 'bg-indigo-600 text-white border-indigo-700'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {SHORT_MONTHS[mIdx]}
                </button>
              ))}
            </div>
          </div>

          {/* Monthly KPIs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-slate-900 text-white p-4 rounded-sm border border-slate-800 shadow-xs">
              <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 font-display block">
                Total Monthly Revenue
              </span>
              <h4 className="text-xl font-black font-mono mt-1 text-white">
                PKR {monthlyData.totalRevenue.toLocaleString()}
              </h4>
              <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                {monthlyData.totalTransactions} transactions
              </p>
            </div>

            <div className="bg-white p-4 rounded-sm border border-slate-200 shadow-xs">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 font-display block">
                Monthly Units Sold
              </span>
              <h4 className="text-xl font-black font-mono mt-1 text-slate-900">
                {monthlyData.totalUnits} Units
              </h4>
              <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                Across catalogue
              </p>
            </div>

            <div className="bg-white p-4 rounded-sm border border-slate-200 shadow-xs">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 font-display block">
                Daily Average Sales
              </span>
              <h4 className="text-xl font-black font-mono mt-1 text-indigo-700">
                PKR {monthlyData.dailyAverage.toLocaleString()}
              </h4>
              <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                Active trading days
              </p>
            </div>

            <div className="bg-white p-4 rounded-sm border border-slate-200 shadow-xs">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 font-display block">
                Peak Sales Day
              </span>
              <h4 className="text-xl font-black font-mono mt-1 text-emerald-700">
                {monthlyData.peakDay && monthlyData.peakDay.revenue > 0
                  ? `Day ${monthlyData.peakDay.day}`
                  : 'N/A'}
              </h4>
              <p className="text-[9px] text-slate-500 mt-0.5 font-mono">
                {monthlyData.peakDay && monthlyData.peakDay.revenue > 0
                  ? `PKR ${monthlyData.peakDay.revenue.toLocaleString()}`
                  : 'PKR 0 revenue'}
              </p>
            </div>

            {isAdmin ? (
              <div className="bg-emerald-950 text-white p-4 rounded-sm border border-emerald-900 shadow-xs">
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 font-display block">
                  Monthly Est. Profit
                </span>
                <h4 className="text-xl font-black font-mono mt-1 text-emerald-300">
                  PKR {monthlyData.totalProfit.toLocaleString()}
                </h4>
                <p className="text-[9px] text-emerald-400/80 mt-0.5 font-mono">
                  {monthlyData.totalRevenue > 0
                    ? `${Math.round((monthlyData.totalProfit / monthlyData.totalRevenue) * 100)}% margin`
                    : '0% margin'}
                </p>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-sm border border-slate-200 shadow-xs">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 font-display block">
                  Wholesale Share
                </span>
                <h4 className="text-xl font-black font-mono mt-1 text-amber-700">
                  PKR {monthlyData.wholesaleRevenue.toLocaleString()}
                </h4>
                <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                  {monthlyData.wholesaleCount} shopkeeper sales
                </p>
              </div>
            )}
          </div>

          {/* Monthly Day-by-Day Visual Bar Chart */}
          <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest font-display flex items-center gap-1.5">
                  <BarChart3 size={14} className="text-indigo-600" />
                  Day-by-Day Revenue Distribution • {MONTH_NAMES[selectedMonth]} {selectedMonthYear}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                  Hover over bars to inspect daily revenue spikes and hardware unit counts.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-sm">
                Peak: PKR {maxMonthlyDayRev.toLocaleString()}
              </span>
            </div>

            {/* Visual Bar Chart Grid */}
            <div className="pt-6 pb-2">
              <div className="h-44 flex items-end gap-1 sm:gap-1.5 w-full border-b border-slate-200 px-1">
                {monthlyData.dailyBreakdown.map((d) => {
                  const heightPercent = maxMonthlyDayRev > 0 ? Math.max((d.revenue / maxMonthlyDayRev) * 100, 3) : 3;
                  const hasSales = d.revenue > 0;
                  return (
                    <div
                      key={d.day}
                      className="flex-1 flex flex-col items-center group relative h-full justify-end"
                    >
                      {/* Tooltip */}
                      <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950 text-white text-[9px] p-2 rounded-sm pointer-events-none z-30 whitespace-nowrap shadow-md border border-slate-800">
                        <span className="font-bold block text-indigo-300 font-display">
                          {MONTH_NAMES[selectedMonth]} {d.day}, {selectedMonthYear}
                        </span>
                        <span className="font-mono block">PKR {d.revenue.toLocaleString()} ({d.units} items)</span>
                      </div>

                      {/* Bar */}
                      <div
                        style={{ height: hasSales ? `${heightPercent}%` : '4px' }}
                        className={`w-full rounded-t-xs transition-all duration-300 ${
                          hasSales
                            ? 'bg-indigo-600 group-hover:bg-indigo-700 shadow-2xs'
                            : 'bg-slate-200 group-hover:bg-slate-300'
                        }`}
                      ></div>
                    </div>
                  );
                })}
              </div>

              {/* X-axis day markers */}
              <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-2 px-1">
                <span>Day 1</span>
                <span>Day 5</span>
                <span>Day 10</span>
                <span>Day 15</span>
                <span>Day 20</span>
                <span>Day 25</span>
                <span>Day {monthlyData.dailyBreakdown.length}</span>
              </div>
            </div>
          </div>

          {/* Monthly Day Breakdown Table */}
          <div className="border border-slate-200 rounded-sm overflow-hidden">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider font-display flex items-center gap-1.5">
                <Calendar size={13} className="text-indigo-400" />
                Active Days Ledger • {MONTH_NAMES[selectedMonth]} {selectedMonthYear}
              </span>
              <span className="text-[10px] font-mono text-indigo-300">
                Total: PKR {monthlyData.totalRevenue.toLocaleString()}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[9px] font-display border-b border-slate-200">
                    <th className="p-3 border-r border-slate-200">Date</th>
                    <th className="p-3 border-r border-slate-200 text-center">Receipts</th>
                    <th className="p-3 border-r border-slate-200 text-center">Units Sold</th>
                    <th className="p-3 border-r border-slate-200">Gross Sales (PKR)</th>
                    <th className="p-3 border-r border-slate-200">Contribution</th>
                    <th className="p-3 text-center">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 font-medium text-slate-700">
                  {monthlyData.dailyBreakdown.filter(d => d.revenue > 0).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 font-mono italic">
                        No transactions registered for {MONTH_NAMES[selectedMonth]} {selectedMonthYear}.
                      </td>
                    </tr>
                  ) : (
                    monthlyData.dailyBreakdown
                      .filter((d) => d.revenue > 0)
                      .map((d) => {
                        const contribution = monthlyData.totalRevenue > 0 ? Math.round((d.revenue / monthlyData.totalRevenue) * 100) : 0;
                        return (
                          <tr key={d.day} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 border-r border-slate-150 font-mono font-bold text-slate-900">
                              {d.dateStr}
                            </td>
                            <td className="p-3 border-r border-slate-150 font-mono text-center">
                              {d.count} sales
                            </td>
                            <td className="p-3 border-r border-slate-150 font-mono font-bold text-center text-slate-800">
                              {d.units}x
                            </td>
                            <td className="p-3 border-r border-slate-150 font-mono font-black text-slate-900">
                              PKR {d.revenue.toLocaleString()}
                            </td>
                            <td className="p-3 border-r border-slate-150">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-indigo-600 h-full rounded-full"
                                    style={{ width: `${contribution}%` }}
                                  ></div>
                                </div>
                                <span className="text-[10px] font-mono text-slate-500 font-bold">{contribution}%</span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => {
                                  setSelectedDay(d.dateStr);
                                  setActiveTab('daily');
                                }}
                                className="text-[9px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2 py-1 rounded-sm border border-indigo-200 cursor-pointer font-display"
                              >
                                View Day
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ==================================================== */}
      {/* 3. YEARLY REPORT VIEW                                */}
      {/* ==================================================== */}
      {activeTab === 'yearly' && isExecutive && (
        <div className="mt-6 space-y-6 animate-in fade-in duration-200">
          
          {/* Controls: Year Selector */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-display">
                Select Calendar Year:
              </span>
              <div className="flex items-center gap-1.5">
                {availableYears.map((yr) => (
                  <button
                    key={yr}
                    onClick={() => setSelectedYear(yr)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-sm border cursor-pointer font-mono transition-colors ${
                      selectedYear === yr
                        ? 'bg-indigo-600 text-white border-indigo-700 font-black shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-xs font-mono text-slate-500">
              Annual summary calculated across all 12 operational months.
            </span>
          </div>

          {/* Yearly KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-slate-900 text-white p-4 rounded-sm border border-slate-800 shadow-xs">
              <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 font-display block">
                Annual Gross Revenue
              </span>
              <h4 className="text-xl font-black font-mono mt-1 text-white">
                PKR {yearlyData.totalRevenue.toLocaleString()}
              </h4>
              <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                {yearlyData.totalTransactions} transactions
              </p>
            </div>

            <div className="bg-white p-4 rounded-sm border border-slate-200 shadow-xs">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 font-display block">
                Annual Volume Sold
              </span>
              <h4 className="text-xl font-black font-mono mt-1 text-slate-900">
                {yearlyData.totalUnits} Units
              </h4>
              <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                Total item units
              </p>
            </div>

            <div className="bg-white p-4 rounded-sm border border-slate-200 shadow-xs">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 font-display block">
                Monthly Average
              </span>
              <h4 className="text-xl font-black font-mono mt-1 text-indigo-700">
                PKR {yearlyData.monthlyAverage.toLocaleString()}
              </h4>
              <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                Per calendar month
              </p>
            </div>

            <div className="bg-white p-4 rounded-sm border border-slate-200 shadow-xs">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 font-display block">
                Top Revenue Month
              </span>
              <h4 className="text-xl font-black font-mono mt-1 text-emerald-700">
                {yearlyData.bestMonth && yearlyData.bestMonth.revenue > 0
                  ? yearlyData.bestMonth.shortName
                  : 'N/A'}
              </h4>
              <p className="text-[9px] text-slate-500 mt-0.5 font-mono">
                {yearlyData.bestMonth && yearlyData.bestMonth.revenue > 0
                  ? `PKR ${yearlyData.bestMonth.revenue.toLocaleString()}`
                  : 'PKR 0'}
              </p>
            </div>

            {isAdmin ? (
              <div className="bg-emerald-950 text-white p-4 rounded-sm border border-emerald-900 shadow-xs">
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 font-display block">
                  Annual Est. Profit
                </span>
                <h4 className="text-xl font-black font-mono mt-1 text-emerald-300">
                  PKR {yearlyData.totalProfit.toLocaleString()}
                </h4>
                <p className="text-[9px] text-emerald-400/80 mt-0.5 font-mono">
                  {yearlyData.totalRevenue > 0
                    ? `${Math.round((yearlyData.totalProfit / yearlyData.totalRevenue) * 100)}% margin`
                    : '0% margin'}
                </p>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-sm border border-slate-200 shadow-xs">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 font-display block">
                  Wholesale Share
                </span>
                <h4 className="text-xl font-black font-mono mt-1 text-amber-700">
                  PKR {yearlyData.wholesaleRevenue.toLocaleString()}
                </h4>
                <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                  {yearlyData.wholesaleCount} bulk orders
                </p>
              </div>
            )}
          </div>

          {/* 12-Month Bar Chart */}
          <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest font-display flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-indigo-600" />
                  12-Month Performance Trajectory • Year {selectedYear}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                  Monthly gross sales comparison across all 12 operational months.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-sm">
                Peak: PKR {maxYearlyMonthRev.toLocaleString()}
              </span>
            </div>

            {/* Annual 12-Month Visual Bar Chart */}
            <div className="pt-6 pb-2">
              <div className="h-44 flex items-end gap-2 sm:gap-3 w-full border-b border-slate-200 px-2">
                {yearlyData.monthsBreakdown.map((m) => {
                  const heightPercent = maxYearlyMonthRev > 0 ? Math.max((m.revenue / maxYearlyMonthRev) * 100, 3) : 3;
                  const hasSales = m.revenue > 0;
                  return (
                    <div
                      key={m.name}
                      className="flex-1 flex flex-col items-center group relative h-full justify-end cursor-pointer"
                      onClick={() => {
                        setSelectedMonth(m.monthIndex);
                        setSelectedMonthYear(selectedYear);
                        setActiveTab('monthly');
                      }}
                    >
                      {/* Tooltip */}
                      <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950 text-white text-[9px] p-2 rounded-sm pointer-events-none z-30 whitespace-nowrap shadow-md border border-slate-800">
                        <span className="font-bold block text-indigo-300 font-display">
                          {m.name} {selectedYear}
                        </span>
                        <span className="font-mono block">PKR {m.revenue.toLocaleString()} ({m.units} units)</span>
                      </div>

                      {/* Bar */}
                      <div
                        style={{ height: hasSales ? `${heightPercent}%` : '4px' }}
                        className={`w-full rounded-t-xs transition-all duration-300 ${
                          hasSales
                            ? 'bg-indigo-600 group-hover:bg-indigo-700 shadow-2xs'
                            : 'bg-slate-200 group-hover:bg-slate-300'
                        }`}
                      ></div>
                    </div>
                  );
                })}
              </div>

              {/* X-axis 12 month labels */}
              <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-2 px-1 font-bold">
                {SHORT_MONTHS.map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
            </div>
          </div>

          {/* 12-Month Table */}
          <div className="border border-slate-200 rounded-sm overflow-hidden">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider font-display flex items-center gap-1.5">
                <BarChart3 size={13} className="text-indigo-400" />
                Annual Financial Breakdown • {selectedYear}
              </span>
              <span className="text-[10px] font-mono text-indigo-300">
                Annual Gross: PKR {yearlyData.totalRevenue.toLocaleString()}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[9px] font-display border-b border-slate-200">
                    <th className="p-3 border-r border-slate-200">Month</th>
                    <th className="p-3 border-r border-slate-200 text-center">Orders</th>
                    <th className="p-3 border-r border-slate-200 text-center">Hardware Units</th>
                    <th className="p-3 border-r border-slate-200">Retail Sales</th>
                    <th className="p-3 border-r border-slate-200">Wholesale Sales</th>
                    <th className="p-3 border-r border-slate-200">Total Revenue (PKR)</th>
                    {isAdmin && <th className="p-3 border-r border-slate-200">Est. Profit</th>}
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 font-medium text-slate-700">
                  {yearlyData.monthsBreakdown.map((m) => (
                    <tr key={m.name} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 border-r border-slate-150 font-display font-bold text-slate-900">
                        {m.name}
                      </td>
                      <td className="p-3 border-r border-slate-150 font-mono text-center">
                        {m.transactions}
                      </td>
                      <td className="p-3 border-r border-slate-150 font-mono font-bold text-center text-slate-800">
                        {m.units}x
                      </td>
                      <td className="p-3 border-r border-slate-150 font-mono text-indigo-700">
                        PKR {m.retailRev.toLocaleString()}
                      </td>
                      <td className="p-3 border-r border-slate-150 font-mono text-amber-700">
                        PKR {m.wholesaleRev.toLocaleString()}
                      </td>
                      <td className="p-3 border-r border-slate-150 font-mono font-black text-slate-900">
                        PKR {m.revenue.toLocaleString()}
                      </td>
                      {isAdmin && (
                        <td className="p-3 border-r border-slate-150 font-mono text-emerald-700 font-bold">
                          PKR {m.profit.toLocaleString()}
                        </td>
                      )}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedMonth(m.monthIndex);
                            setSelectedMonthYear(selectedYear);
                            setActiveTab('monthly');
                          }}
                          className="text-[9px] bg-white hover:bg-slate-100 text-indigo-700 font-bold px-2 py-1 rounded-sm border border-slate-300 cursor-pointer font-display"
                        >
                          Drilldown
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ==================================================== */}
      {/* 4. ALL TRANSACTIONS LEDGER (Audited Register)        */}
      {/* ==================================================== */}
      {activeTab === 'ledger' && (
        <div className="mt-6 space-y-4 animate-in fade-in duration-200">
          
          {/* Search & Filter bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search item name, barcode, phone..."
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-sm bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
              />
            </div>

            {/* Buyer Type Filter */}
            <div>
              <select
                value={ledgerBuyerFilter}
                onChange={(e) => setLedgerBuyerFilter(e.target.value as any)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-sm bg-slate-50 focus:bg-white font-display font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">All Buyer Channels (Retail & Wholesale)</option>
                <option value="customer">Retail Walk-in Customers</option>
                <option value="shopkeeper">Wholesale Shopkeepers</option>
              </select>
            </div>

            {/* Cashier / Operator Filter */}
            <div>
              <select
                value={ledgerOperatorFilter}
                onChange={(e) => setLedgerOperatorFilter(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-sm bg-slate-50 focus:bg-white font-display font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">All Processors (Admin, Shoaib, Zohaib)</option>
                <option value="Admin">Admin Processed</option>
                <option value="Shoaib">Shoaib Processed</option>
                <option value="Zohaib">Zohaib Processed</option>
              </select>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto rounded-sm border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-350 font-black uppercase tracking-wider text-[9px] font-display">
                  <th className="p-3 border-r border-slate-800">Item Title</th>
                  <th className="p-3 border-r border-slate-800">Client Info</th>
                  <th className="p-3 border-r border-slate-800 text-center">Units</th>
                  <th className="p-3 border-r border-slate-800">Disc. (PKR)</th>
                  <th className="p-3 border-r border-slate-800">Total Collected (PKR)</th>
                  <th className="p-3 border-r border-slate-800">Processed by</th>
                  <th className="p-3 border-r border-slate-800">Date & Time</th>
                  <th className="p-3 text-center">Checkout Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 font-medium text-slate-700">
                {filteredLedgerLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-slate-500 font-mono italic">
                      No matching sales logs found in the ledger.
                    </td>
                  </tr>
                ) : (
                  [...filteredLedgerLogs].reverse().map((log) => (
                    <tr key={log.id} className="hover:bg-slate-100/50 transition-colors">
                      {/* ITEM INFO */}
                      <td className="p-3 border-r border-slate-150 font-sans">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-[12px]">{log.productName}</span>
                          <span className="font-mono text-[9px] text-slate-450 mt-0.5">Barcode: {log.barcode}</span>
                        </div>
                      </td>

                      {/* CLIENT CATEGORY */}
                      <td className="p-3 border-r border-slate-150">
                        <div className="flex flex-col gap-1 items-start font-sans">
                          <span className={`capitalize text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded-sm border uppercase font-display ${
                            log.buyerType === 'customer' 
                              ? 'bg-indigo-50 border-indigo-150 text-indigo-800' 
                              : 'bg-amber-50 border-amber-150 text-amber-800'
                          }`}>
                            {log.buyerType}
                          </span>
                          {log.customerPhone && (
                            <span className="text-[9px] text-slate-500 font-mono mt-0.5 block select-all">
                              Phone: {log.customerPhone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* QUANTITY */}
                      <td className="p-3 border-r border-slate-150 font-mono font-bold text-slate-900 text-xs text-center">
                        {log.quantity}x
                      </td>

                      {/* DISCOUNT */}
                      <td className="p-3 border-r border-slate-150 font-mono text-slate-600 text-[11px]">
                        {log.buyerType === 'customer' 
                          ? (log.discountApplied > 0 ? `-PKR ${log.discountApplied.toLocaleString()}` : 'PKR 0')
                          : 'N/A'}
                      </td>

                      {/* FINAL AMOUNT */}
                      <td className="p-3 border-r border-slate-150 font-mono font-black text-slate-900 text-[13px]">
                        PKR {log.finalPrice.toLocaleString()}
                      </td>

                      {/* PROCESSED BY */}
                      <td className="p-3 border-r border-slate-150 text-slate-600 font-sans">
                        <span className="inline-flex items-center gap-1 font-bold text-[10px] text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-sm">
                          <User size={10} className="text-slate-400" /> {log.soldBy}
                        </span>
                      </td>

                      {/* DATE */}
                      <td className="p-3 border-r border-slate-150 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                        {log.date}
                      </td>

                      {/* CANCEL BUTTON */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            if (confirm(`Are you absolutely sure you want to cancel and reverse this sale receipt? Stock quantity will be returned back to the catalog.`)) {
                              onCancelSale(log.id);
                            }
                          }}
                          className="inline-flex items-center gap-1 text-[9px] bg-red-50 hover:bg-red-100 text-red-700 font-black uppercase tracking-wider px-2.5 py-1.5 rounded-sm border border-red-150 transition-colors cursor-pointer font-display shadow-2xs"
                          title="Cancel Sale & Revert Stock seamlessly"
                        >
                          <X size={10} /> Cancel sale
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

    </div>
  );
};
