
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { updateAlias } from './actions';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import BackButton from '@/components/BackButton';

const getReportedIssues = (): string[] => {
  if (typeof window === 'undefined') return [];
  const issues = localStorage.getItem('reportedIssues');
  return issues ? JSON.parse(issues) : [];
};

const clearReportedIssues = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('reportedIssues');
};

export default function AdminPage() {
  const [reportedIssues, setReportedIssues] = useState<string[]>([]);
  const [aliases, setAliases] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    setReportedIssues(getReportedIssues());
  }, []);

  const handleAliasChange = (originalName: string, alias: string) => {
    setAliases(prev => ({ ...prev, [originalName]: alias }));
  };

  const handleSubmit = async (originalName: string) => {
    const alias = aliases[originalName];
    if (!alias) {
      toast({
        title: 'Error',
        description: 'Alias cannot be empty.',
        variant: 'destructive',
      });
      return;
    }
    
    const result = await updateAlias(originalName, alias);

    if (result.success) {
      toast({
        title: 'Success',
        description: `Alias for '${originalName}' updated to '${alias}'.`,
      });
      // Remove from reported issues and update state
      const newReported = reportedIssues.filter(name => name !== originalName);
      localStorage.setItem('reportedIssues', JSON.stringify(newReported));
      setReportedIssues(newReported);
    } else {
      toast({
        title: 'Error updating alias',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const handleClearAll = () => {
    clearReportedIssues();
    setReportedIssues([]);
    toast({
        title: 'Success',
        description: 'All reported issues have been cleared.',
    });
  }

  return (
    <main className="container mx-auto py-8 px-4 relative">
        <BackButton />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-headline text-white [text-shadow:_0_1px_10px_rgb(0_0_0_/_50%)]">Image Alias Management</h1>
      </div>
      <p className="text-white/80 mb-8 [text-shadow:_0_1px_10px_rgb(0_0_0_/_50%)]">
        Use this page to correct image loading issues by providing the correct Fandom wiki name for characters.
      </p>

      <div className="animate-map-open bg-black/30 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/20">
        <div className="flex justify-between items-center mb-6">
            <div>
                <h2 className='font-headline text-2xl text-white [text-shadow:_0_1px_10px_rgb(0_0_0_/_50%)]'>Reported Image Issues</h2>
                <p className="text-white/70">
                The following characters were flagged for having image loading problems.
                </p>
            </div>
            <Button variant="destructive" onClick={handleClearAll} disabled={reportedIssues.length === 0}>
                Clear All Reports
            </Button>
          </div>
          {reportedIssues.length > 0 ? (
            <div className="space-y-6">
              {reportedIssues.map(name => (
                <div key={name}>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSubmit(name);
                    }}
                    className="flex flex-col sm:flex-row items-end gap-4"
                  >
                    <div className="grid gap-2 flex-1 w-full">
                      <Label htmlFor={`name-${name}`} className="font-semibold text-white/80">
                        Original Name
                      </Label>
                      <Input id={`name-${name}`} value={name} disabled className="bg-black/20 border-white/10 text-white/90" />
                    </div>
                    <div className="grid gap-2 flex-1 w-full">
                      <Label htmlFor={`alias-${name}`} className="font-semibold text-white/80">
                        Correct Fandom Name (Alias)
                      </Label>
                      <Input
                        id={`alias-${name}`}
                        placeholder="e.g., Karoo"
                        value={aliases[name] || ''}
                        onChange={(e) => handleAliasChange(name, e.target.value)}
                         className="bg-black/20 border-white/10 text-white placeholder:text-white/40"
                      />
                    </div>
                    <Button type="submit">Save Alias</Button>
                  </form>
                  <Separator className="mt-6 bg-white/20" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/60 text-center py-8">
              No image issues reported yet.
            </p>
          )}
      </div>
    </main>
  );
}
