import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Plus, 
  CheckCircle,
  XCircle,
  Loader2,
  Ruler,
  Eye,
  Zap,
  ClipboardCheck
} from 'lucide-react';
import { Product, Specification, SpecificationType, SPECIFICATION_TYPE_LABELS } from '@/types/database.types';

interface InspectionResultInput {
  specification_id: string;
  actual_value: string;
  is_pass: boolean;
  remarks: string;
}

const SPEC_TYPE_ICONS: Record<SpecificationType, React.ReactNode> = {
  dimensional: <Ruler className="h-3.5 w-3.5" />,
  visual: <Eye className="h-3.5 w-3.5" />,
  functional: <Zap className="h-3.5 w-3.5" />,
  compliance: <ClipboardCheck className="h-3.5 w-3.5" />,
};

const SPEC_TYPE_COLORS: Record<SpecificationType, string> = {
  dimensional: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  visual: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  functional: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  compliance: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

export default function CreateInspection() {
  const navigate = useNavigate();
  const { profile, role } = useAuth();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [specifications, setSpecifications] = useState<Specification[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [batchNumber, setBatchNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [results, setResults] = useState<InspectionResultInput[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSpecs, setIsLoadingSpecs] = useState(false);

  // Redirect if not auditor
  useEffect(() => {
    if (role && role !== 'auditor') {
      navigate('/dashboard');
    }
  }, [role, navigate]);

  // Fetch only active products
  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching products:', error);
        return;
      }

      setProducts(data as Product[]);
    };

    fetchProducts();
  }, []);

  // Fetch specifications when product is selected
  useEffect(() => {
    const fetchSpecifications = async () => {
      if (!selectedProduct) {
        setSpecifications([]);
        setResults([]);
        return;
      }

      setIsLoadingSpecs(true);

      const { data, error } = await supabase
        .from('specifications')
        .select('*')
        .eq('product_id', selectedProduct)
        .order('specification_type')
        .order('parameter_name');

      if (error) {
        console.error('Error fetching specifications:', error);
        setIsLoadingSpecs(false);
        return;
      }

      setSpecifications(data as Specification[]);
      
      // Initialize results for each specification
      setResults(
        (data as Specification[]).map((spec) => ({
          specification_id: spec.id,
          actual_value: '',
          is_pass: true,
          remarks: '',
        }))
      );

      setIsLoadingSpecs(false);
    };

    fetchSpecifications();
  }, [selectedProduct]);

  const handleResultChange = (index: number, field: keyof InspectionResultInput, value: any) => {
    setResults((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      const spec = specifications[index];
      
      // Auto-calculate pass/fail based on specification type
      if (field === 'actual_value') {
        if (spec.specification_type === 'dimensional' && spec.tolerance_min !== null && spec.tolerance_max !== null) {
          const numValue = parseFloat(value);
          if (!isNaN(numValue)) {
            updated[index].is_pass = numValue >= spec.tolerance_min && numValue <= spec.tolerance_max;
          }
        }
      }
      
      return updated;
    });
  };

  const togglePassFail = (index: number) => {
    setResults((prev) => {
      const updated = [...prev];
      const spec = specifications[index];
      
      // For non-dimensional types, allow manual toggle
      if (spec.specification_type !== 'dimensional') {
        updated[index] = { ...updated[index], is_pass: !updated[index].is_pass };
        // Set actual value based on type
        if (spec.specification_type === 'compliance') {
          updated[index].actual_value = !updated[index].is_pass ? 'No' : 'Yes';
        } else {
          updated[index].actual_value = !updated[index].is_pass ? 'Fail' : 'Pass';
        }
      } else {
        updated[index] = { ...updated[index], is_pass: !updated[index].is_pass };
      }
      
      return updated;
    });
  };

  const getSpecDisplayInfo = (spec: Specification) => {
    switch (spec.specification_type) {
      case 'dimensional':
        return {
          standard: spec.standard_value + (spec.unit ? ` ${spec.unit}` : ''),
          tolerance: spec.tolerance_min !== null ? `${spec.tolerance_min} - ${spec.tolerance_max}` : null,
        };
      case 'visual':
        return {
          standard: spec.condition_description || spec.standard_value,
          tolerance: spec.photo_required ? 'Photo Required' : null,
        };
      case 'functional':
        return {
          standard: spec.test_description || spec.standard_value,
          tolerance: spec.remarks_required ? 'Remarks Required' : null,
        };
      case 'compliance':
        return {
          standard: spec.check_method || spec.standard_value,
          tolerance: spec.evidence_required ? 'Evidence Required' : null,
        };
      default:
        return { standard: spec.standard_value, tolerance: null };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct || !profile) {
      toast({
        title: 'Error',
        description: 'Please select a product.',
        variant: 'destructive',
      });
      return;
    }

    // Validate all results have values
    const missingValues = results.some((r, index) => {
      const spec = specifications[index];
      if (spec.specification_type === 'dimensional') {
        return !r.actual_value.trim();
      }
      // For non-dimensional, actual_value is set from is_pass toggle
      return false;
    });

    if (missingValues) {
      toast({
        title: 'Error',
        description: 'Please fill in all measurement values for dimensional specifications.',
        variant: 'destructive',
      });
      return;
    }

    // Check required remarks
    const missingRemarks = results.some((r, index) => {
      const spec = specifications[index];
      return spec.remarks_required && !r.remarks.trim();
    });

    if (missingRemarks) {
      toast({
        title: 'Error',
        description: 'Please fill in required remarks.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Generate inspection number
      const { data: numberData, error: numberError } = await supabase
        .rpc('generate_inspection_number');

      if (numberError) throw numberError;

      const inspectionNumber = numberData;

      // Create inspection
      const { data: inspectionData, error: inspectionError } = await supabase
        .from('inspections')
        .insert({
          inspection_number: inspectionNumber,
          product_id: selectedProduct,
          created_by: profile.id,
          batch_number: batchNumber || null,
          remarks: remarks || null,
          status: 'pending_team_leader',
        })
        .select()
        .single();

      if (inspectionError) throw inspectionError;

      // Create inspection results
      const resultsToInsert = results.map((r, index) => {
        const spec = specifications[index];
        let actualValue = r.actual_value;
        
        // For non-dimensional types, ensure actual_value is set
        if (spec.specification_type !== 'dimensional' && !actualValue) {
          actualValue = spec.specification_type === 'compliance' 
            ? (r.is_pass ? 'Yes' : 'No')
            : (r.is_pass ? 'Pass' : 'Fail');
        }
        
        return {
          inspection_id: inspectionData.id,
          specification_id: r.specification_id,
          actual_value: actualValue,
          is_pass: r.is_pass,
          remarks: r.remarks || null,
        };
      });

      const { error: resultsError } = await supabase
        .from('inspection_results')
        .insert(resultsToInsert);

      if (resultsError) throw resultsError;

      toast({
        title: 'Success',
        description: `Inspection ${inspectionNumber} created successfully.`,
      });

      navigate('/inspections');
    } catch (error) {
      console.error('Error creating inspection:', error);
      toast({
        title: 'Error',
        description: 'Failed to create inspection. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderInputForSpec = (spec: Specification, index: number) => {
    const result = results[index];
    if (!result) return null;

    switch (spec.specification_type) {
      case 'dimensional':
        return (
          <Input
            type="text"
            placeholder="Enter value"
            value={result.actual_value}
            onChange={(e) => handleResultChange(index, 'actual_value', e.target.value)}
            className="w-28"
          />
        );
      case 'visual':
      case 'functional':
        return (
          <button
            type="button"
            onClick={() => togglePassFail(index)}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              result.is_pass
                ? 'bg-success/15 text-success hover:bg-success/25'
                : 'bg-destructive/15 text-destructive hover:bg-destructive/25'
            }`}
          >
            {result.is_pass ? (
              <>
                <CheckCircle className="h-3.5 w-3.5" />
                Pass
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5" />
                Fail
              </>
            )}
          </button>
        );
      case 'compliance':
        return (
          <button
            type="button"
            onClick={() => togglePassFail(index)}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              result.is_pass
                ? 'bg-success/15 text-success hover:bg-success/25'
                : 'bg-destructive/15 text-destructive hover:bg-destructive/25'
            }`}
          >
            {result.is_pass ? (
              <>
                <CheckCircle className="h-3.5 w-3.5" />
                Yes
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5" />
                No
              </>
            )}
          </button>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/inspections')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create Inspection</h1>
          <p className="text-muted-foreground">
            Record quality inspection for a product
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
            <CardDescription>
              Select the product to inspect
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product">Product *</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger id="product">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.part_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="batch">Batch Number</Label>
                <Input
                  id="batch"
                  placeholder="Enter batch number (optional)"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Specifications & Results */}
        {selectedProduct && (
          <Card>
            <CardHeader>
              <CardTitle>Inspection Checks</CardTitle>
              <CardDescription>
                Record results for each specification
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSpecs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : specifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No specifications defined for this product.</p>
                  <p className="text-sm mt-1">
                    Contact the Quality Head to add specifications.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Parameter</th>
                        <th>Standard / Description</th>
                        <th>Tolerance / Requirement</th>
                        <th>Result *</th>
                        <th>Status</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {specifications.map((spec, index) => {
                        const displayInfo = getSpecDisplayInfo(spec);
                        return (
                          <tr key={spec.id}>
                            <td>
                              <Badge className={`gap-1 text-[10px] ${SPEC_TYPE_COLORS[spec.specification_type]}`}>
                                {SPEC_TYPE_ICONS[spec.specification_type]}
                                {SPECIFICATION_TYPE_LABELS[spec.specification_type]}
                              </Badge>
                            </td>
                            <td className="font-medium">{spec.parameter_name}</td>
                            <td className="max-w-xs text-sm" title={displayInfo.standard}>
                              <span className="line-clamp-2">{displayInfo.standard}</span>
                            </td>
                            <td className="text-muted-foreground text-sm">
                              {displayInfo.tolerance || '-'}
                            </td>
                            <td>
                              {renderInputForSpec(spec, index)}
                            </td>
                            <td>
                              {spec.specification_type === 'dimensional' && (
                                <button
                                  type="button"
                                  onClick={() => togglePassFail(index)}
                                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    results[index]?.is_pass
                                      ? 'bg-success/15 text-success hover:bg-success/25'
                                      : 'bg-destructive/15 text-destructive hover:bg-destructive/25'
                                  }`}
                                >
                                  {results[index]?.is_pass ? (
                                    <>
                                      <CheckCircle className="h-3.5 w-3.5" />
                                      Pass
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="h-3.5 w-3.5" />
                                      Fail
                                    </>
                                  )}
                                </button>
                              )}
                            </td>
                            <td>
                              <Input
                                type="text"
                                placeholder={spec.remarks_required ? "Required" : "Optional"}
                                value={results[index]?.remarks || ''}
                                onChange={(e) => handleResultChange(index, 'remarks', e.target.value)}
                                className={`w-32 ${spec.remarks_required ? 'border-amber-500' : ''}`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Remarks */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Remarks</CardTitle>
            <CardDescription>
              Add any additional notes or observations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Enter any additional remarks..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/inspections')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !selectedProduct || specifications.length === 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Inspection
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}