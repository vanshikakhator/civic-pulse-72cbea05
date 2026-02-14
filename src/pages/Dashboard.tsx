import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { PriorityBadge, StatusBadge } from "@/components/PriorityBadge";
import { LeafletMap } from "@/components/LeafletMap";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { FileText, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

interface Complaint {
  id: string;
  title: string;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  category: string;
  priority: string;
  status: string;
  created_at: string;
}

const STATUS_COLORS = ["#f59e0b", "#3b82f6", "#22c55e"];
const PRIORITY_COLORS = ["#ef4444", "#f59e0b", "#22c55e"];

export default function Dashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("complaints")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setComplaints(data);
      });
  }, [user]);

  const total = complaints.length;
  const pending = complaints.filter(c => c.status === "Pending").length;
  const inProgress = complaints.filter(c => c.status === "In Progress").length;
  const resolved = complaints.filter(c => c.status === "Resolved").length;

  // Status pie
  const statusData = [
    { name: "Pending", value: pending },
    { name: "In Progress", value: inProgress },
    { name: "Resolved", value: resolved },
  ].filter(d => d.value > 0);

  // Category bar
  const catCount: Record<string, number> = {};
  complaints.forEach(c => { catCount[c.category] = (catCount[c.category] || 0) + 1; });
  const categoryData = Object.entries(catCount).map(([name, count]) => ({ name, count }));

  // Priority pie
  const priorityData = [
    { name: "High", value: complaints.filter(c => c.priority === "High").length },
    { name: "Medium", value: complaints.filter(c => c.priority === "Medium").length },
    { name: "Low", value: complaints.filter(c => c.priority === "Low").length },
  ].filter(d => d.value > 0);

  const mapMarkers = complaints
    .filter(c => c.latitude && c.longitude)
    .map(c => ({
      lat: c.latitude!,
      lng: c.longitude!,
      popup: `<strong>${c.title}</strong><br/>${c.category} • ${c.priority}`,
      priority: c.priority,
    }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Citizen Dashboard</h1>
            <p className="text-sm text-muted-foreground">Track and manage your civic complaints</p>
          </div>
          <Link to="/complaints/new">
            <Button className="gradient-accent text-accent-foreground">
              + New Complaint
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Complaints" value={total} icon={FileText} variant="default" />
          <StatCard title="Pending" value={pending} icon={Clock} variant="warning" />
          <StatCard title="In Progress" value={inProgress} icon={AlertTriangle} variant="accent" />
          <StatCard title="Resolved" value={resolved} icon={CheckCircle} variant="accent" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-base">Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label>
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
              <CardTitle className="font-display text-base">Priority Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={priorityData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label>
                    {priorityData.map((_, i) => (
                      <Cell key={i} fill={PRIORITY_COLORS[i % PRIORITY_COLORS.length]} />
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
              <CardTitle className="font-display text-base">By Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(174, 60%, 40%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">Your Complaints Map</CardTitle>
            </CardHeader>
            <CardContent>
              <LeafletMap markers={mapMarkers} zoom={5} className="h-[350px] w-full rounded-lg" />
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">Recent Complaints</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {complaints.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 animate-fade-in">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground">{c.location} • {c.category}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <PriorityBadge priority={c.priority} />
                      <StatusBadge status={c.status} />
                    </div>
                  </div>
                ))}
                {complaints.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No complaints yet. Submit your first complaint!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
