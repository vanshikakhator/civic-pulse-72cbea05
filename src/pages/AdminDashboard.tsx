import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { LeafletMap } from "@/components/LeafletMap";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { FileText, AlertTriangle, CheckCircle, TrendingUp, MapPin, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getRiskLevel } from "@/lib/classifyComplaint";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

interface Complaint {
  id: string;
  title: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  category: string;
  priority: string;
  status: string;
  created_at: string;
}

const COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];
const STATUS_COLORS = ["#f59e0b", "#3b82f6", "#22c55e"];

export default function AdminDashboard() {
  const { isAdmin, loading } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    supabase
      .from("complaints")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setComplaints(data); });
  }, []);

  if (!loading && !isAdmin) return <Navigate to="/dashboard" replace />;

  const categories = [...new Set(complaints.map(c => c.category))];

  const filtered = complaints.filter(c => {
    if (filterCategory !== "all" && c.category !== filterCategory) return false;
    if (filterPriority !== "all" && c.priority !== filterPriority) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    return true;
  });

  const total = complaints.length;
  const high = complaints.filter(c => c.priority === "High").length;
  const resolved = complaints.filter(c => c.status === "Resolved").length;
  const pending = complaints.filter(c => c.status === "Pending").length;
  const inProgress = complaints.filter(c => c.status === "In Progress").length;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  // Category chart data from filtered
  const categoryCount: Record<string, number> = {};
  filtered.forEach(c => { categoryCount[c.category] = (categoryCount[c.category] || 0) + 1; });
  const categoryData = Object.entries(categoryCount).map(([name, count]) => ({ name, count }));

  // Priority pie data from filtered
  const priorityData = [
    { name: "High", value: filtered.filter(c => c.priority === "High").length },
    { name: "Medium", value: filtered.filter(c => c.priority === "Medium").length },
    { name: "Low", value: filtered.filter(c => c.priority === "Low").length },
  ].filter(d => d.value > 0);

  // Status pie data
  const statusData = [
    { name: "Pending", value: filtered.filter(c => c.status === "Pending").length },
    { name: "In Progress", value: filtered.filter(c => c.status === "In Progress").length },
    { name: "Resolved", value: filtered.filter(c => c.status === "Resolved").length },
  ].filter(d => d.value > 0);

  // Area-wise complaint count
  const areaCount: Record<string, { total: number; high: number }> = {};
  complaints.forEach(c => {
    if (!areaCount[c.location]) areaCount[c.location] = { total: 0, high: 0 };
    areaCount[c.location].total++;
    if (c.priority === "High") areaCount[c.location].high++;
  });
  const areaData = Object.entries(areaCount)
    .map(([name, data]) => ({
      name: name.length > 18 ? name.substring(0, 18) + "…" : name,
      fullName: name,
      count: data.total,
      risk: getRiskLevel(data.total, data.high),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const mapMarkers = filtered
    .filter(c => c.latitude && c.longitude)
    .map(c => ({
      lat: c.latitude!,
      lng: c.longitude!,
      popup: `<strong>${c.title}</strong><br/>${c.category} • ${c.priority}`,
      priority: c.priority,
    }));

  const riskColors: Record<string, string> = {
    High: "bg-destructive/15 text-destructive",
    Medium: "bg-priority-medium/15 text-priority-medium",
    Low: "bg-muted text-muted-foreground",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of all civic complaints and analytics</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard title="Total Complaints" value={total} icon={FileText} variant="default" />
          <StatCard title="High Priority" value={high} icon={AlertTriangle} variant="danger" />
          <StatCard title="Pending" value={pending} icon={FileText} variant="warning" />
          <StatCard title="In Progress" value={inProgress} icon={TrendingUp} variant="accent" />
          <StatCard title="Resolved" value={resolved} icon={CheckCircle} variant="accent" />
          <StatCard title="Resolution Rate" value={`${resolutionRate}%`} icon={TrendingUp} variant="default" />
        </div>

        {/* Filters */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex gap-3 flex-wrap items-center">
              <span className="text-sm font-medium text-muted-foreground">Filters:</span>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground ml-auto">
                Showing {filtered.length} of {total} complaints
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">Complaints by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(174, 60%, 40%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">Priority Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={priorityData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label>
                    {priorityData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Status distribution + Area-wise complaint count */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label>
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <MapPin className="w-4 h-4 text-accent" /> Area-wise Complaint Count
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {areaData.map(area => (
                  <div key={area.fullName} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium truncate">{area.name}</span>
                      <Badge variant="outline" className={`text-[10px] ${riskColors[area.risk]}`}>
                        {area.risk} Risk
                      </Badge>
                    </div>
                    <span className="text-sm font-bold">{area.count}</span>
                  </div>
                ))}
                {areaData.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-lg">All Complaints Map</CardTitle>
          </CardHeader>
          <CardContent>
            <LeafletMap markers={mapMarkers} zoom={5} className="h-[400px] w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
