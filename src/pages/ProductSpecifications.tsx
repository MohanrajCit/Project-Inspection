import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  Plus, 
  Pencil, 
  Trash2,
  Loader2,
  Ruler,
  Eye,
  Zap,
  ClipboardCheck
} from 'lucide-react';
import { Product, Specification, SpecificationType, SPECIFICATION_TYPE_LABELS } from '@/types/database.types';

const SPEC_TYPE_ICONS: Record<SpecificationType, React.ReactNode> = {
  dimensional: <Ruler className="h-4 w-4" />,
  visual: <Eye className="h-4 w-4" />,
  functional: <Zap className="h-4 w-4" />,
  compliance: <ClipboardCheck className="h-4 w-4" />,
};

const SPEC_TYPE_COLORS: Record<SpecificationType, string> = {
  dimensional: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  visual: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  functional: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  compliance: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

interface FormData {
  parameter_name: string;
  specification_type: SpecificationType;
  // Dimensional fields
  standard_value: string;
  tolerance_min: string;
  tolerance_max: string;
  unit: string;
  // Common
  check_method: string;
  // Visual fields
  condition_description: string;
  photo_required: boolean;
  // Functional fields
  test_description: string;
  remarks_required: boolean;
  // Compliance fields
  evidence_required: boolean;
  // Result type for non-dimensional
  result_type: string;
}

const initialFormData: FormData = {
  parameter_name: '',
  specification_type: 'dimensional',
  standard_value: '',
  tolerance_min: '',
  tolerance_max: '',
  unit: '',
  check_method: '',
  condition_description: '',
  photo_required: false,
  test_description: '',
  remarks_required: false,
  evidence_required: false,
  result_type: 'pass_fail',
};

export default function ProductSpecifications() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const { toast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [specifications, setSpecifications] = useState<Specification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSpec, setEditingSpec] = useState<Specification | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  // Redirect if not quality head
  useEffect(() => {
    if (role && role !== 'quality_head') {
      navigate('/dashboard');
    }
  }, [role, navigate]);

  const fetchData = async () => {
    if (!id) return;
    
    setIsLoading(true);

    try {
      // Fetch product
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (productError) throw productError;
      setProduct(productData as Product);

      // Fetch specifications
      const { data: specsData, error: specsError } = await supabase
        .from('specifications')
        .select('*')
        .eq('product_id', id)
        .order('specification_type')
        .order('parameter_name');

      if (specsError) throw specsError;
      setSpecifications(specsData as Specification[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load product data.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleOpenDialog = (spec?: Specification) => {
    if (spec) {
      setEditingSpec(spec);
      setFormData({
        parameter_name: spec.parameter_name,
        specification_type: spec.specification_type,
        standard_value: spec.standard_value,
        tolerance_min: spec.tolerance_min?.toString() || '',
        tolerance_max: spec.tolerance_max?.toString() || '',
        unit: spec.unit || '',
        check_method: spec.check_method || '',
        condition_description: spec.condition_description || '',
        photo_required: spec.photo_required || false,
        test_description: spec.test_description || '',
        remarks_required: spec.remarks_required || false,
        evidence_required: spec.evidence_required || false,
        result_type: spec.result_type || 'pass_fail',
      });
    } else {
      setEditingSpec(null);
      setFormData(initialFormData);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.parameter_name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Parameter Name is required.',
        variant: 'destructive',
      });
      return;
    }

    // Validate based on type
    if (formData.specification_type === 'dimensional' && !formData.standard_value.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Standard Value is required for dimensional specifications.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.specification_type === 'visual' && !formData.condition_description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Condition Description is required for visual specifications.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.specification_type === 'functional' && !formData.test_description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Test Description is required for functional specifications.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const specData = {
        product_id: id!,
        parameter_name: formData.parameter_name.trim(),
        specification_type: formData.specification_type,
        standard_value: formData.specification_type === 'dimensional' 
          ? formData.standard_value.trim() 
          : formData.specification_type === 'visual'
            ? formData.condition_description.trim()
            : formData.specification_type === 'functional'
              ? formData.test_description.trim()
              : formData.parameter_name.trim(),
        tolerance_min: formData.specification_type === 'dimensional' && formData.tolerance_min 
          ? parseFloat(formData.tolerance_min) : null,
        tolerance_max: formData.specification_type === 'dimensional' && formData.tolerance_max 
          ? parseFloat(formData.tolerance_max) : null,
        unit: formData.specification_type === 'dimensional' ? (formData.unit.trim() || null) : null,
        check_method: formData.check_method.trim() || null,
        condition_description: formData.specification_type === 'visual' 
          ? formData.condition_description.trim() : null,
        photo_required: formData.specification_type === 'visual' ? formData.photo_required : false,
        test_description: formData.specification_type === 'functional' 
          ? formData.test_description.trim() : null,
        remarks_required: formData.specification_type === 'functional' ? formData.remarks_required : false,
        evidence_required: formData.specification_type === 'compliance' ? formData.evidence_required : false,
        result_type: formData.specification_type !== 'dimensional' 
          ? (formData.specification_type === 'compliance' ? 'yes_no' : 'pass_fail') : null,
      };

      if (editingSpec) {
        const { error } = await supabase
          .from('specifications')
          .update(specData)
          .eq('id', editingSpec.id);

        if (error) throw error;

        toast({
          title: 'Specification Updated',
          description: 'Specification has been updated successfully.',
        });
      } else {
        const { error } = await supabase
          .from('specifications')
          .insert(specData);

        if (error) throw error;

        toast({
          title: 'Specification Added',
          description: 'Specification has been added successfully.',
        });
      }

      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving specification:', error);
      toast({
        title: 'Error',
        description: 'Failed to save specification.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (spec: Specification) => {
    if (!confirm(`Are you sure you want to delete "${spec.parameter_name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('specifications')
        .delete()
        .eq('id', spec.id);

      if (error) {
        if (error.message?.includes('referenced by existing inspection results') || error.code === '23503') {
          toast({
            title: 'Cannot Delete Specification',
            description: 'This specification is already used in inspection records and cannot be deleted to preserve audit integrity.',
            variant: 'destructive',
          });
          return;
        }
        throw error;
      }

      toast({
        title: 'Specification Deleted',
        description: 'Specification has been deleted successfully.',
      });

      fetchData();
    } catch (error: any) {
      console.error('Error deleting specification:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete specification.',
        variant: 'destructive',
      });
    }
  };

  const renderTypeSpecificFields = () => {
    switch (formData.specification_type) {
      case 'dimensional':
        return (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="standard_value">Standard Value *</Label>
                <Input
                  id="standard_value"
                  placeholder="e.g., 10.5"
                  value={formData.standard_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, standard_value: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  placeholder="e.g., mm, kg, °C"
                  value={formData.unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tolerance_min">Tolerance Min</Label>
                <Input
                  id="tolerance_min"
                  type="number"
                  step="any"
                  placeholder="e.g., 10.0"
                  value={formData.tolerance_min}
                  onChange={(e) => setFormData(prev => ({ ...prev, tolerance_min: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tolerance_max">Tolerance Max</Label>
                <Input
                  id="tolerance_max"
                  type="number"
                  step="any"
                  placeholder="e.g., 11.0"
                  value={formData.tolerance_max}
                  onChange={(e) => setFormData(prev => ({ ...prev, tolerance_max: e.target.value }))}
                />
              </div>
            </div>
          </>
        );
      case 'visual':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="condition_description">Condition Description *</Label>
              <Textarea
                id="condition_description"
                placeholder="e.g., No visible scratches, cracks, or surface defects"
                value={formData.condition_description}
                onChange={(e) => setFormData(prev => ({ ...prev, condition_description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="photo_required">Photo Required</Label>
                <p className="text-sm text-muted-foreground">Require photo evidence for this check</p>
              </div>
              <Switch
                id="photo_required"
                checked={formData.photo_required}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, photo_required: checked }))}
              />
            </div>
          </>
        );
      case 'functional':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="test_description">Test Description *</Label>
              <Textarea
                id="test_description"
                placeholder="e.g., Camera should capture clear images, autofocus within 2 seconds"
                value={formData.test_description}
                onChange={(e) => setFormData(prev => ({ ...prev, test_description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="remarks_required">Remarks Required</Label>
                <p className="text-sm text-muted-foreground">Require auditor to add remarks for this test</p>
              </div>
              <Switch
                id="remarks_required"
                checked={formData.remarks_required}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, remarks_required: checked }))}
              />
            </div>
          </>
        );
      case 'compliance':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="check_method">Checklist Description</Label>
              <Textarea
                id="check_method"
                placeholder="e.g., Verify IMEI is programmed and matches label"
                value={formData.check_method}
                onChange={(e) => setFormData(prev => ({ ...prev, check_method: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="evidence_required">Evidence Required</Label>
                <p className="text-sm text-muted-foreground">Require evidence upload for this compliance check</p>
              </div>
              <Switch
                id="evidence_required"
                checked={formData.evidence_required}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, evidence_required: checked }))}
              />
            </div>
          </>
        );
    }
  };

  const getSpecDisplayValue = (spec: Specification) => {
    switch (spec.specification_type) {
      case 'dimensional':
        return spec.standard_value + (spec.unit ? ` ${spec.unit}` : '');
      case 'visual':
        return spec.condition_description || spec.standard_value;
      case 'functional':
        return spec.test_description || spec.standard_value;
      case 'compliance':
        return spec.check_method || spec.standard_value;
      default:
        return spec.standard_value;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">Product not found</p>
        <Button variant="link" onClick={() => navigate('/products')}>
          Back to Products
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/products')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <p className="text-muted-foreground font-mono">
            {product.part_number}
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4" />
              Add Specification
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSpec ? 'Edit Specification' : 'Add Specification'}
              </DialogTitle>
              <DialogDescription>
                {editingSpec
                  ? 'Update the specification details below.'
                  : 'Define a new quality specification for this product.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="specification_type">Specification Type *</Label>
                <Select 
                  value={formData.specification_type} 
                  onValueChange={(value: SpecificationType) => setFormData(prev => ({ ...prev, specification_type: value }))}
                >
                  <SelectTrigger id="specification_type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dimensional">
                      <span className="flex items-center gap-2">
                        <Ruler className="h-4 w-4" />
                        Dimensional (Measurements)
                      </span>
                    </SelectItem>
                    <SelectItem value="visual">
                      <span className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Visual (Appearance)
                      </span>
                    </SelectItem>
                    <SelectItem value="functional">
                      <span className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Functional (Performance)
                      </span>
                    </SelectItem>
                    <SelectItem value="compliance">
                      <span className="flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4" />
                        Compliance (Process)
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="parameter_name">Parameter Name *</Label>
                <Input
                  id="parameter_name"
                  placeholder={
                    formData.specification_type === 'dimensional' ? 'e.g., Thickness, Weight' :
                    formData.specification_type === 'visual' ? 'e.g., Surface Finish, Alignment' :
                    formData.specification_type === 'functional' ? 'e.g., Camera Test, Button Response' :
                    'e.g., IMEI Check, Label Verification'
                  }
                  value={formData.parameter_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, parameter_name: e.target.value }))}
                />
              </div>

              {renderTypeSpecificFields()}

              {formData.specification_type !== 'compliance' && (
                <div className="space-y-2">
                  <Label htmlFor="check_method">Check Method</Label>
                  <Input
                    id="check_method"
                    placeholder={
                      formData.specification_type === 'dimensional' ? 'e.g., Digital Caliper' :
                      formData.specification_type === 'visual' ? 'e.g., Visual Inspection' :
                      'e.g., Manual Test'
                    }
                    value={formData.check_method}
                    onChange={(e) => setFormData(prev => ({ ...prev, check_method: e.target.value }))}
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : editingSpec ? (
                    'Update Specification'
                  ) : (
                    'Add Specification'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Specifications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Specifications</CardTitle>
          <CardDescription>
            Quality parameters across all specification types
          </CardDescription>
        </CardHeader>
        <CardContent>
          {specifications.length === 0 ? (
            <div className="text-center py-12">
              <Ruler className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No specifications yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add specifications to define quality parameters for this product.
              </p>
              <Button className="mt-4" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Specification
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Parameter</th>
                    <th>Standard / Description</th>
                    <th>Tolerance / Requirements</th>
                    <th>Check Method</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {specifications.map((spec) => (
                    <tr key={spec.id}>
                      <td>
                        <Badge className={`gap-1 ${SPEC_TYPE_COLORS[spec.specification_type]}`}>
                          {SPEC_TYPE_ICONS[spec.specification_type]}
                          {SPECIFICATION_TYPE_LABELS[spec.specification_type]}
                        </Badge>
                      </td>
                      <td className="font-medium">{spec.parameter_name}</td>
                      <td className="max-w-xs truncate" title={getSpecDisplayValue(spec)}>
                        {getSpecDisplayValue(spec)}
                      </td>
                      <td className="text-muted-foreground">
                        {spec.specification_type === 'dimensional' && spec.tolerance_min !== null ? (
                          `${spec.tolerance_min} - ${spec.tolerance_max} ${spec.unit || ''}`
                        ) : spec.specification_type === 'visual' && spec.photo_required ? (
                          'Photo Required'
                        ) : spec.specification_type === 'functional' && spec.remarks_required ? (
                          'Remarks Required'
                        ) : spec.specification_type === 'compliance' && spec.evidence_required ? (
                          'Evidence Required'
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="text-muted-foreground">{spec.check_method || '-'}</td>
                      <td>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenDialog(spec)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(spec)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}