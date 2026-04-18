import { useRef, useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ImagePlus, X } from 'lucide-react';
import { useSubmitEntry } from '@/hooks/useSubmitEntry';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeId: string;
  challengeTitle: string;
}

export const SubmitEntryDrawer = ({ open, onOpenChange, challengeId, challengeTitle }: Props) => {
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submit = useSubmitEntry();

  const handleFile = (f: File | null) => {
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  };

  const handleSubmit = async () => {
    await submit.mutateAsync(
      { challengeId, caption, file },
      {
        onSuccess: () => {
          setCaption('');
          handleFile(null);
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Prijavi se na izazov</DrawerTitle>
          <DrawerDescription className="line-clamp-1">{challengeTitle}</DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 px-4 pb-2">
          {/* Image picker */}
          {previewUrl ? (
            <div className="relative overflow-hidden rounded-xl border border-border/50">
              <img src={previewUrl} alt="preview" className="h-48 w-full object-cover" />
              <button
                onClick={() => handleFile(null)}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 backdrop-blur"
                aria-label="Ukloni"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/30 text-muted-foreground transition hover:bg-muted/50"
            >
              <ImagePlus className="h-6 w-6" />
              <span className="text-xs">Dodaj sliku (do 5 MB)</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] || null)}
          />

          {/* Caption */}
          <div>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, 280))}
              placeholder="Opiši momenat… (opciono)"
              rows={3}
              className="resize-none"
            />
            <div className="mt-1 text-right text-[10px] text-muted-foreground">
              {caption.length}/280
            </div>
          </div>
        </div>

        <DrawerFooter>
          <Button
            onClick={handleSubmit}
            disabled={submit.isPending || (!caption.trim() && !file)}
            className="w-full"
          >
            {submit.isPending ? 'Šaljem…' : 'Pošalji prijavu'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
