import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PriorityBadge, StatusBadge } from "@/components/PriorityBadge";
import { LeafletMap } from "@/components/LeafletMap";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "sonner";

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

export default function AdminComplaints() {
  const { isAdmin, loading } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selected, setSelected] = useState<Complaint | null>(null);

  const fetchComplaints = async () => {
    const { data } = await supabase
      .from("complaints")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setComplaints(data);
  };

  useEffect(() => { fetchComplaints(); }, []);

  if (!loading && !isAdmin) return <Navigate to="/dashboard" replace />;

  const categories = [...new Set(complaints.map(c => c.category))];

  const filtered = complaints.filter(c => {
    if (filterCategory !== "all" && c.category !== filterCategory) return false;
    if (filterPriority !== "all" && c.priority !== filterPriority) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    return true;
  });

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("complaints").update({ status }).eq("id", id);
    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Status updated to ${status}`);
      fetchComplaints();
      if (selected?.id === id) setSelected({ ...selected, status });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold">Manage Complaints</h1>

        <div className="flex gap-3 flex-wrap">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto">
            {filtered.length} of {complaints.length} complaints
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="shadow-card">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(c => (
                      <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(c)}>
                        <TableCell className="font-medium max-w-[150px] truncate">{c.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[100px] truncate">{c.location}</TableCell>
                        <TableCell className="text-sm">{c.category}</TableCell>
                        <TableCell><PriorityBadge priority={c.priority} /></TableCell>
                        <TableCell><StatusBadge status={c.status} /></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(c.created_at), "MMM dd")}</TableCell>
                        <TableCell>
                          <Select value={c.status} onValueChange={(v) => { updateStatus(c.id, v); }}>
                            <SelectTrigger className="w-32 h-8 text-xs" onClick={e => e.stopPropagation()}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pending">Pending</SelectItem>
                              <SelectItem value="In Progress">In Progress</SelectItem>
                              <SelectItem value="Resolved">Resolved</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div>
            {selected && (
              <Card className="shadow-card animate-fade-in">
                <CardHeader>
                  <CardTitle className="font-display text-lg">{selected.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{selected.description}</p>
                  <div className="flex gap-2">
                    <PriorityBadge priority={selected.priority} />
                    <StatusBadge status={selected.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">📍 {selected.location}</p>
                  {selected.latitude && selected.longitude && (
                    <LeafletMap
                      center={[selected.latitude, selected.longitude]}
                      markers={[{
                        lat: selected.latitude,
                        lng: selected.longitude,
                        popup: selected.title,
                        priority: selected.priority,
                      }]}
                      zoom={13}
                      className="h-[250px] w-full rounded-lg"
                    />
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
