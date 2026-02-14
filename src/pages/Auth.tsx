import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, ArrowRight, User, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type LoginMode = "select" | "citizen" | "admin";

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<LoginMode>("select");

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await signIn(email, password);
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    // Check role and redirect accordingly
    const { data: { user } } = await supabase.auth.getUser();
    if (mode === "admin" && user) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const hasAdmin = roles?.some(r => r.role === "admin");
      if (!hasAdmin) {
        setLoading(false);
        toast.error("You do not have admin access. Please login as a citizen.");
        await supabase.auth.signOut();
        return;
      }
      toast.success("Welcome, Admin!");
      navigate("/admin");
    } else {
      toast.success("Welcome back!");
      navigate("/dashboard");
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const { error } = await signUp(
      formData.get("email") as string,
      formData.get("password") as string,
      formData.get("name") as string
    );
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created! You can now log in.");
    }
  };

  if (mode === "select") {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
        <div className="w-full max-w-lg animate-fade-in">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-accent mb-4">
              <Shield className="w-8 h-8 text-accent-foreground" />
            </div>
            <h1 className="text-3xl font-display font-bold text-primary-foreground">SmartGov</h1>
            <p className="text-primary-foreground/70 mt-1">AI-Assisted Civic Intelligence System</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Card
              className="shadow-elevated border-0 cursor-pointer hover:scale-[1.03] transition-transform group"
              onClick={() => setMode("citizen")}
            >
              <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-accent/15 flex items-center justify-center group-hover:bg-accent/25 transition-colors">
                  <User className="w-8 h-8 text-accent" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-bold">Citizen Login</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Submit & track your civic complaints
                  </p>
                </div>
                <Button variant="outline" className="w-full mt-2">
                  Continue as Citizen <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            <Card
              className="shadow-elevated border-0 cursor-pointer hover:scale-[1.03] transition-transform group"
              onClick={() => setMode("admin")}
            >
              <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-destructive/15 flex items-center justify-center group-hover:bg-destructive/25 transition-colors">
                  <ShieldCheck className="w-8 h-8 text-destructive" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-bold">Admin Login</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage complaints & view analytics
                  </p>
                </div>
                <Button variant="outline" className="w-full mt-2">
                  Continue as Admin <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const isCitizen = mode === "citizen";
  const modeLabel = isCitizen ? "Citizen" : "Admin";
  const ModeIcon = isCitizen ? User : ShieldCheck;
  const modeColor = isCitizen ? "bg-accent/15 text-accent" : "bg-destructive/15 text-destructive";

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-accent mb-4">
            <Shield className="w-8 h-8 text-accent-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold text-primary-foreground">SmartGov</h1>
          <p className="text-primary-foreground/70 mt-1">AI-Assisted Civic Intelligence</p>
        </div>

        <Card className="shadow-elevated border-0">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modeColor}`}>
                <ModeIcon className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="font-display">{modeLabel} Portal</CardTitle>
                <CardDescription>
                  {isCitizen ? "Sign in or register as a citizen" : "Sign in with admin credentials"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input id="signin-email" name="email" type="email" required placeholder="you@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input id="signin-password" name="password" type="password" required placeholder="••••••••" />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing in..." : `Sign In as ${modeLabel}`} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <Input id="signup-name" name="name" required placeholder="John Doe" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" name="email" type="email" required placeholder="you@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input id="signup-password" name="password" type="password" required minLength={6} placeholder="••••••••" />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Creating account..." : "Create Account"} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </form>
                </TabsContent>

            </Tabs>

            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-4 text-muted-foreground"
              onClick={() => setMode("select")}
            >
              ← Back to role selection
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
