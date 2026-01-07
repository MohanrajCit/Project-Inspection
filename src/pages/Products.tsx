import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  Plus, 
  Pencil, 
  Trash2, 
  Settings,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Product, Specification } from '@/types/database.types';
import { format } from 'date-fns';

export default function Products() {
  const navigate = useNavigate();
  const { profile, role } = useAuth();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    part_number: '',
    description: '',
  });

  // Redirect if not quality head
  useEffect(() => {
    if (role && role !== 'quality_head') {
      navigate('/dashboard');
    }
  }, [role, navigate]);

  const fetchProducts = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true) // Only show active products
      .order('name');

    if (error) {
      console.error('Error fetching products:', error);
    } else {
      setProducts(data as Product[]);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        part_number: product.part_number,
        description: product.description || '',
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: '', part_number: '', description: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.part_number.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name and Part Number are required.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingProduct) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update({
            name: formData.name.trim(),
            part_number: formData.part_number.trim(),
            description: formData.description.trim() || null,
          })
          .eq('id', editingProduct.id);

        if (error) throw error;

        toast({
          title: 'Product Updated',
          description: 'Product has been updated successfully.',
        });
      } else {
        // Create new product
        const { error } = await supabase
          .from('products')
          .insert({
            name: formData.name.trim(),
            part_number: formData.part_number.trim(),
            description: formData.description.trim() || null,
            created_by: profile?.id,
          });

        if (error) {
          if (error.code === '23505') {
            toast({
              title: 'Error',
              description: 'A product with this part number already exists.',
              variant: 'destructive',
            });
            return;
          }
          throw error;
        }

        toast({
          title: 'Product Created',
          description: 'Product has been created successfully.',
        });
      }

      setIsDialogOpen(false);
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        title: 'Error',
        description: 'Failed to save product.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (product: Product) => {
    if (!confirm(`Are you sure you want to deactivate "${product.name}"? It will no longer be available for new inspections.`)) {
      return;
    }

    try {
      // First try soft-delete (deactivate)
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', product.id);

      if (error) throw error;

      toast({
        title: 'Product Deactivated',
        description: 'Product has been deactivated and will not appear in new inspections.',
      });

      fetchProducts();
    } catch (error) {
      console.error('Error deactivating product:', error);
      toast({
        title: 'Error',
        description: 'Failed to deactivate product.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground mt-1">
            Manage products and their specifications
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </DialogTitle>
              <DialogDescription>
                {editingProduct
                  ? 'Update the product details below.'
                  : 'Enter the details for the new product.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Brake Pad Assembly"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="part_number">Part Number *</Label>
                <Input
                  id="part_number"
                  placeholder="e.g., BPA-2024-001"
                  value={formData.part_number}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, part_number: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Optional description..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                />
              </div>
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
                  ) : editingProduct ? (
                    'Update Product'
                  ) : (
                    'Create Product'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No products yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add your first product to get started.
            </p>
            <Button className="mt-4" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Package className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{product.name}</CardTitle>
                      <CardDescription className="font-mono text-xs">
                        {product.part_number}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {product.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {product.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Created {format(new Date(product.created_at), 'MMM d, yyyy')}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => navigate(`/products/${product.id}/specifications`)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenDialog(product)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeactivate(product)}
                      title="Deactivate product"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
