import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const InstagramCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      toast.error('Instagram connection cancelled');
      navigate('/profile');
      return;
    }

    if (code && user) {
      processCallback(code);
    } else if (!user) {
      navigate('/auth');
    }
  }, [searchParams, user]);

  const processCallback = async (code: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('instagram-auth', {
        body: { code, user_id: user!.id },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Instagram connected! ✓');
      } else {
        toast.error(data?.error || 'Failed to connect Instagram');
      }
    } catch (err) {
      console.error('Instagram callback error:', err);
      toast.error('Failed to connect Instagram');
    } finally {
      setProcessing(false);
      navigate('/profile');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Connecting Instagram...</p>
      </div>
    </div>
  );
};

export default InstagramCallback;
