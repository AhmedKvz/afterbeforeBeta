import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Loader2, Eye, EyeOff, Music, Building2, Check, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { z } from 'zod';
import { cn } from '@/lib/utils';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type AccountType = 'party_goer' | 'club_venue';

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [authStep, setAuthStep] = useState<0 | 1>(0);
  const [isSignUp, setIsSignUp] = useState(false);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = () => {
    try {
      authSchema.parse({ email, password });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: { email?: string; password?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0] === 'email') newErrors.email = err.message;
          if (err.path[0] === 'password') newErrors.password = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleContinue = () => {
    if (!accountType) {
      toast.error('Please select an account type');
      return;
    }
    setAuthStep(1);
  };

  const handleSignInClick = () => {
    setIsSignUp(false);
    setAuthStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, accountType || 'party_goer');
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('This email is already registered. Please sign in instead.');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Check your email to confirm your account!');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login')) {
            toast.error('Invalid email or password');
          } else {
            toast.error(error.message);
          }
        } else {
          navigate('/');
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="text-6xl mb-4"
          >
            🌙
          </motion.div>
          <h1 className="text-4xl font-bold gradient-text mb-2">AfterBefore</h1>
          <p className="text-muted-foreground">Where the night begins</p>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 0: Role Selection */}
          {authStep === 0 && (
            <motion.div
              key="role-select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <p className="text-center text-muted-foreground text-sm">Choose your experience</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Party Goer Card */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setAccountType('party_goer'); setIsSignUp(true); }}
                  className={cn(
                    'relative glass-card p-6 text-left transition-all duration-300 rounded-2xl',
                    accountType === 'party_goer'
                      ? 'border-primary ring-2 ring-primary/40 shadow-[0_0_30px_rgba(168,85,247,0.15)]'
                      : 'hover:border-primary/30'
                  )}
                >
                  {accountType === 'party_goer' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                    >
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </motion.div>
                  )}
                  <div className="text-4xl mb-3">🎶</div>
                  <h3 className="text-lg font-bold mb-1">Party Goer</h3>
                  <p className="text-sm text-muted-foreground">Find events, match with people, earn rewards</p>
                </motion.button>

                {/* Club / Venue Card */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setAccountType('club_venue'); setIsSignUp(true); }}
                  className={cn(
                    'relative glass-card p-6 text-left transition-all duration-300 rounded-2xl',
                    accountType === 'club_venue'
                      ? 'border-primary ring-2 ring-primary/40 shadow-[0_0_30px_rgba(168,85,247,0.15)]'
                      : 'hover:border-primary/30'
                  )}
                >
                  {accountType === 'club_venue' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                    >
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </motion.div>
                  )}
                  <div className="text-4xl mb-3">🏢</div>
                  <h3 className="text-lg font-bold mb-1">Club / Venue</h3>
                  <p className="text-sm text-muted-foreground">Post events, grow your audience, track engagement</p>
                </motion.button>
              </div>

              {/* Continue Button */}
              <AnimatePresence>
                {accountType && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                  >
                    <button
                      onClick={handleContinue}
                      className="w-full btn-gradient py-4 rounded-xl font-medium"
                    >
                      Continue
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sign In shortcut */}
              <div className="text-center">
                <button
                  onClick={handleSignInClick}
                  className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                >
                  Already have an account? <span className="text-primary">Sign In</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 1: Email / Password */}
          {authStep === 1 && (
            <motion.div
              key="email-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Back button */}
              {isSignUp && (
                <button
                  onClick={() => setAuthStep(0)}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-sm mb-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-destructive text-sm">{errors.email}</p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-4 rounded-xl bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-destructive text-sm">{errors.password}</p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-gradient py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>{isSignUp ? 'Create Account' : 'Sign In'}</>
                  )}
                </button>
              </form>

              {/* Toggle */}
              <div className="text-center mt-6">
                <button
                  onClick={() => {
                    if (isSignUp) {
                      setIsSignUp(false);
                    } else {
                      setIsSignUp(true);
                      setAuthStep(0);
                    }
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isSignUp ? (
                    <>Already have an account? <span className="text-primary">Sign In</span></>
                  ) : (
                    <>Don't have an account? <span className="text-primary">Sign Up</span></>
                  )}
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4 my-8">
                <div className="flex-1 h-px bg-border" />
                <span className="text-muted-foreground text-sm">or continue with</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Social Login */}
              <button className="w-full glass-card py-4 flex items-center justify-center gap-3 hover:border-primary/50">
                <span className="text-xl">📷</span>
                <span className="font-medium">Instagram</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Auth;
