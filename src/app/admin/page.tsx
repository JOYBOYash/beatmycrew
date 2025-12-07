
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
    <main className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-headline">Image Alias Management</h1>
        <Button variant="outline" asChild>
          <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" />Back to App</Link>
        </Button>
      </div>
      <p className="text-muted-foreground mb-8">
        Use this page to correct image loading issues by providing the correct Fandom wiki name for characters.
      </p>

      <Card className="bg-card/80 backdrop-blur-sm border-white/20">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
                <CardTitle>Reported Image Issues</CardTitle>
                <CardDescription>
                The following characters were flagged for having image loading problems.
                </CardDescription>
            </div>
            <Button variant="destructive" onClick={handleClearAll} disabled={reportedIssues.length === 0}>
                Clear All Reports
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
                      <Label htmlFor={`name-${name}`} className="font-semibold">
                        Original Name
                      </Label>
                      <Input id={`name-${name}`} value={name} disabled />
                    </div>
                    <div className="grid gap-2 flex-1 w-full">
                      <Label htmlFor={`alias-${name}`} className="font-semibold">
                        Correct Fandom Name (Alias)
                      </Label>
                      <Input
                        id={`alias-${name}`}
                        placeholder="e.g., Karoo"
                        value={aliases[name] || ''}
                        onChange={(e) => handleAliasChange(name, e.target.value)}
                      />
                    </div>
                    <Button type="submit">Save Alias</Button>
                  </form>
                  <Separator className="mt-6" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No image issues reported yet.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
