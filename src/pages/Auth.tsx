import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Shield, Sun, Moon, Eye, EyeOff, Loader2, Key } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  confirmPassword: z.string(),
  registrationCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [systemInitialized, setSystemInitialized] = useState<boolean | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    confirmPassword: '',
    registrationCode: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signIn, signUp, user, checkSystemInitialized } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if system is initialized (Quality Head exists)
  useEffect(() => {
    const checkInit = async () => {
      const initialized = await checkSystemInitialized();
      setSystemInitialized(initialized);
    };
    checkInit();
  }, []);

  // Redirect if already logged in
  if (user) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      if (isLogin) {
        const result = loginSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: 'Login Failed',
              description: 'Invalid email or password. Please try again.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Login Failed',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Welcome back!',
            description: 'You have successfully logged in.',
          });
          navigate('/dashboard');
        }
      } else {
        const result = signupSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        const { error } = await signUp(formData.email, formData.password, formData.fullName, formData.registrationCode);
        if (error) {
          toast({
            title: 'Sign Up Failed',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          // Determine what message to show based on registration
          const isBootstrap = formData.registrationCode === 'QA-BOOTSTRAP-2024';
          toast({
            title: 'Account Created!',
            description: isBootstrap 
              ? 'You have been registered as Quality Head. Welcome to the system!'
              : 'Your account has been created with Auditor role.',
          });
          // Refresh system initialization status
          const initialized = await checkSystemInitialized();
          setSystemInitialized(initialized);
          navigate('/dashboard');
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="rounded-full"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
              <Shield className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">QA Management System</h1>
            <p className="text-muted-foreground mt-1">
              Product Layout Inspection & Quality Assurance
            </p>
          </div>

          <Card className="border-border/50 shadow-lg">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl">
                {isLogin ? 'Welcome back' : 'Create an account'}
              </CardTitle>
              <CardDescription>
                {isLogin
                  ? 'Enter your credentials to access your dashboard'
                  : 'Enter your details to create your account'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      placeholder="John Doe"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className={errors.fullName ? 'border-destructive' : ''}
                    />
                    {errors.fullName && (
                      <p className="text-sm text-destructive">{errors.fullName}</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@company.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>

                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className={errors.confirmPassword ? 'border-destructive' : ''}
                    />
                    {errors.confirmPassword && (
                      <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                    )}
                  </div>
                )}

                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="registrationCode" className="flex items-center gap-2">
                      <Key className="h-3.5 w-3.5" />
                      Registration Code
                    </Label>
                    <Input
                      id="registrationCode"
                      name="registrationCode"
                      type="text"
                      placeholder={systemInitialized === false ? 'Enter bootstrap code' : 'Enter registration code (optional)'}
                      value={formData.registrationCode}
                      onChange={handleInputChange}
                      className={errors.registrationCode ? 'border-destructive' : ''}
                    />
                    {errors.registrationCode && (
                      <p className="text-sm text-destructive">{errors.registrationCode}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {systemInitialized === false 
                        ? 'System not initialized. Enter the bootstrap code to become Quality Head.'
                        : 'Leave empty to register as Auditor, or enter a code provided by your administrator.'
                      }
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isLogin ? 'Signing in...' : 'Creating account...'}
                    </>
                  ) : (
                    <>{isLogin ? 'Sign In' : 'Create Account'}</>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setErrors({});
                  }}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {isLogin
                    ? "Don't have an account? Sign up"
                    : 'Already have an account? Sign in'}
                </button>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Enterprise Quality Management System
            <br />
            Secure • Reliable • Audit-Ready
          </p>
        </div>
      </div>
    </div>
  );
}
