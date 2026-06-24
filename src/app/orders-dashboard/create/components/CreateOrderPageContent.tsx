'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/ui/back-button';
import { Search, Plus, X, Loader2, Save, DollarSign, Percent, Tag as TagIcon, Truck, CreditCard, FileText, User, MapPin, Package } from 'lucide-react';

interface OrderItem {
  id: string;
  productId?: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
}

interface Customer {
  id?: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  tags: string[];
  lifetimeValue?: number;
  orderCount?: number;
}

interface Address {
  firstName: string;
  lastName: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

const emptyAddress: Address = {
  firstName: '',
  lastName: '',
  company: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'US',
  phone: '',
};

export default function CreateOrderPageContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Customer
  const [customerSearch, setCustomerSearch] = useState('');
  const [customer, setCustomer] = useState<Customer>({
    name: '',
    email: '',
    phone: '',
    notes: '',
    tags: [],
  });
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [customerResults, setCustomerResults] = useState<any[]>([]);

  // Products
  const [productSearch, setProductSearch] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [productResults, setProductResults] = useState<any[]>([]);

  // Addresses
  const [shippingAddress, setShippingAddress] = useState<Address>(emptyAddress);
  const [billingAddress, setBillingAddress] = useState<Address>(emptyAddress);
  const [sameAsShipping, setSameAsShipping] = useState(true);

  // Shipping
  const [shippingMethod, setShippingMethod] = useState('standard');
  const [carrier, setCarrier] = useState('');
  const [serviceLevel, setServiceLevel] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingCost, setShippingCost] = useState(0);

  // Discounts & Taxes
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [taxExempt, setTaxExempt] = useState(false);
  const [taxAdjustment, setTaxAdjustment] = useState(0);

  // Payment
  const [markAsPaid, setMarkAsPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'authorized' | 'partially_paid'>('pending');
  const [sendInvoice, setSendInvoice] = useState(false);

  // Order notes & custom fields
  const [internalNotes, setInternalNotes] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [salesRep, setSalesRep] = useState('');
  const [customerReference, setCustomerReference] = useState('');
  const [warehouseNotes, setWarehouseNotes] = useState('');

  const [allCustomers, setAllCustomers] = useState<any[]>([]);

  // Load all customers on mount for instant dropdown
  // Falls back to Stripe-sync if local DB is empty
  useEffect(() => {
    const loadAll = async () => {
      try {
        const res = await fetch('/api/customers?limit=100');
        const data = await res.json();
        const localCustomers = data.customers || [];
        if (localCustomers.length > 0) {
          setAllCustomers(localCustomers);
        } else {
          // Local DB is empty — fetch from Stripe sync
          const syncRes = await fetch('/api/customers/stripe-sync?limit=100');
          const syncData = await syncRes.json();
          setAllCustomers(syncData.customers || []);
        }
      } catch {
        // If both fail, try stripe-sync directly
        try {
          const syncRes = await fetch('/api/customers/stripe-sync?limit=100');
          const syncData = await syncRes.json();
          setAllCustomers(syncData.customers || []);
        } catch {}
      }
    };
    loadAll();
  }, []);

  // Filter customers based on search input
  // Shows all customers when search is empty, filters as user types
  useEffect(() => {
    if (!customerSearch) {
      setCustomerResults(allCustomers);
      return;
    }
    const q = customerSearch.toLowerCase();
    setCustomerResults(
      allCustomers.filter((c: any) =>
        (c.name ?? '').toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q)
      )
    );
  }, [customerSearch, allCustomers]);

  // Search products with debounce
  useEffect(() => {
    if (!productSearch || productSearch.length < 2) {
      setProductResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingProducts(true);
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(productSearch)}&limit=10`);
        const data = await res.json();
        setProductResults(data.products || []);
      } catch (error) {
        console.error('Product search error:', error);
      } finally {
        setSearchingProducts(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [productSearch]);

  // Calculate totals
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.total, 0);
  }, [items]);

  const discountTotal = useMemo(() => {
    if (discountType === 'percentage') {
      return subtotal * (discountValue / 100);
    }
    return discountValue;
  }, [subtotal, discountType, discountValue]);

  const taxTotal = useMemo(() => {
    if (taxExempt) return taxAdjustment;
    const taxableAmount = subtotal - discountTotal + shippingCost;
    return (taxableAmount * (taxRate / 100)) + taxAdjustment;
  }, [subtotal, discountTotal, shippingCost, taxRate, taxExempt, taxAdjustment]);

  const grandTotal = useMemo(() => {
    return subtotal - discountTotal + shippingCost + taxTotal;
  }, [subtotal, discountTotal, shippingCost, taxTotal]);

  const handleClearCustomer = () => {
    setCustomer({ name: '', email: '', phone: '', notes: '', tags: [] });
    setShippingAddress(emptyAddress);
    setCustomerSearch('');
    setCustomerResults([]);
  };

  const handleSelectCustomer = (cust: any) => {
    setCustomer({
      id: cust.id,
      name: cust.name || '',
      email: cust.email || '',
      phone: cust.phone || '',
      notes: '',
      tags: cust.tags || [],
      lifetimeValue: cust.lifetimeValue,
      orderCount: cust.orderCount,
    });
    // Pre-fill shipping address from customer data (Stripe format: cust.address)
    const addr = cust.address;
    if (addr) {
      setShippingAddress({
        firstName: cust.name?.split(' ')[0] || '',
        lastName: cust.name?.split(' ').slice(1).join(' ') || '',
        company: '',
        address1: addr.line1 || '',
        address2: addr.line2 || '',
        city: addr.city || '',
        state: addr.state || '',
        postalCode: addr.postal_code || '',
        country: addr.country || 'US',
        phone: cust.phone || '',
      });
    }
    setCustomerSearch('');
    setCustomerResults([]);
  };

  const handleAddProduct = (product: any) => {
    const newItem: OrderItem = {
      id: Math.random().toString(36).substr(2, 9),
      productId: product.id,
      name: product.name,
      sku: product.sku || '',
      quantity: 1,
      price: parseFloat(product.price) || 0,
      discount: 0,
      total: parseFloat(product.price) || 0,
    };
    setItems([...items, newItem]);
    setProductSearch('');
    setProductResults([]);
  };

  const handleUpdateItem = (id: string, field: keyof OrderItem, value: any) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'quantity' || field === 'price' || field === 'discount') {
        updated.total = (updated.quantity * updated.price) - updated.discount;
      }
      return updated;
    }));
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleCopyShippingToBilling = () => {
    if (sameAsShipping) {
      setBillingAddress({ ...shippingAddress });
    }
  };

  useEffect(() => {
    if (sameAsShipping) {
      setBillingAddress({ ...shippingAddress });
    }
  }, [sameAsShipping, shippingAddress]);

  const validateForm = (): string | null => {
    if (!customer.email) return 'Customer email is required';
    if (items.length === 0) return 'At least one product is required';
    return null;
  };

  const handleSubmit = async (draft = false) => {
    const error = validateForm();
    if (error && !draft) {
      alert(error);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customer: customer.id ? { id: customer.id } : customer,
        customerId: customer.id,
        items: items.map(item => ({
          productId: item.productId,
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
          total: item.total,
        })),
        shippingAddress,
        billingAddress: sameAsShipping ? shippingAddress : billingAddress,
        shippingMethod,
        carrier,
        serviceLevel,
        trackingNumber,
        shippingTotal: shippingCost,
        discountTotal,
        taxTotal,
        subtotal,
        total: grandTotal,
        paymentStatus: markAsPaid ? 'paid' : paymentStatus,
        paymentMethod,
        notes: internalNotes,
        metadata: {
          poNumber,
          salesRep,
          customerReference,
          warehouseNotes,
          couponCode,
          sendInvoice,
        },
        status: draft ? 'draft' : 'pending',
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create order');
      }

      const order = await res.json();
      router.push(`/orders-dashboard`);
    } catch (error: any) {
      alert(error.message || 'Failed to create order');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors';
  const labelCls = 'text-xs font-500 text-foreground block mb-1';

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-600 text-foreground">Create Order</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manually create a new order</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - 70% */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Customer Section */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <User size={16} className="text-primary" />
              <h3 className="text-sm font-600 text-foreground">Customer</h3>
            </div>

            <div className="relative mb-4">
              {customer.id ? (
                // Show selected customer as a tag with clear button
                <div className="flex items-center gap-2 w-full h-9 px-3 rounded-lg border border-primary bg-background text-sm text-foreground">
                  <User size={14} className="text-primary flex-shrink-0" />
                  <span className="flex-1 truncate font-500">{customer.name || customer.email}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleClearCustomer(); }}
                    className="flex items-center justify-center w-5 h-5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-danger"
                    title="Clear selected customer"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search customers by name or email..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    onFocus={() => setCustomerResults(allCustomers)}
                    onBlur={() => setTimeout(() => setCustomerResults([]), 150)}
                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                  />
                  {searchingCustomers && (
                    <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
                  )}
                </>
              )}
            </div>

            {customerResults.length > 0 && (
              <div className="mb-4 bg-muted/30 border border-border rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
                {customerResults.map((cust) => (
                  <button
                    key={cust.id}
                    onMouseDown={(e) => { e.preventDefault(); handleSelectCustomer(cust); }}
                    className="w-full px-3 py-2 text-left hover:bg-muted transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-500 text-foreground">{cust.name || 'No name'}</p>
                      <p className="text-xs text-muted-foreground">{cust.email}</p>
                    </div>
                    {cust.orderCount > 0 && (
                      <span className="text-xs text-muted-foreground">{cust.orderCount} orders</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Name</label>
                <input
                  type="text"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  className={inputCls}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className={labelCls}>Email *</label>
                <input
                  type="email"
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  className={inputCls}
                  placeholder="john@example.com"
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input
                  type="tel"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  className={inputCls}
                  placeholder="+1 555 000 0000"
                />
              </div>
              <div>
                <label className={labelCls}>Tags (comma separated)</label>
                <input
                  type="text"
                  value={customer.tags.join(', ')}
                  onChange={(e) => setCustomer({ ...customer, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                  className={inputCls}
                  placeholder="VIP, Returning"
                />
              </div>
            </div>

            {customer.id && (
              <div className="mt-3 p-3 bg-muted/30 rounded-lg flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Existing customer</span>
                <div className="flex items-center gap-4 text-xs">
                  {customer.orderCount !== undefined && (
                    <span className="text-muted-foreground">{customer.orderCount} orders</span>
                  )}
                  {customer.lifetimeValue !== undefined && (
                    <span className="text-foreground font-500">${customer.lifetimeValue.toFixed(2)} LTV</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Products Section */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Package size={16} className="text-primary" />
              <h3 className="text-sm font-600 text-foreground">Products</h3>
            </div>

            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products by name, SKU, or barcode..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
              />
              {searchingProducts && (
                <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
              )}
            </div>

            {productResults.length > 0 && (
              <div className="mb-4 bg-muted/30 border border-border rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
                {productResults.map((prod) => (
                  <button
                    key={prod.id}
                    onClick={() => handleAddProduct(prod)}
                    className="w-full px-3 py-2 text-left hover:bg-muted transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-500 text-foreground">{prod.name}</p>
                      <p className="text-xs text-muted-foreground">{prod.sku || 'No SKU'}</p>
                    </div>
                    <span className="text-sm font-500 text-foreground">${parseFloat(prod.price || 0).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            )}

            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No products added. Search and select products above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-xs font-500 text-muted-foreground">Product</th>
                      <th className="text-left py-2 text-xs font-500 text-muted-foreground">SKU</th>
                      <th className="text-right py-2 text-xs font-500 text-muted-foreground">Qty</th>
                      <th className="text-right py-2 text-xs font-500 text-muted-foreground">Price</th>
                      <th className="text-right py-2 text-xs font-500 text-muted-foreground">Discount</th>
                      <th className="text-right py-2 text-xs font-500 text-muted-foreground">Total</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-border last:border-0">
                        <td className="py-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                            className="w-full h-8 px-2 rounded border border-border bg-background text-sm"
                          />
                        </td>
                        <td className="py-2">
                          <input
                            type="text"
                            value={item.sku}
                            onChange={(e) => handleUpdateItem(item.id, 'sku', e.target.value)}
                            className="w-full h-8 px-2 rounded border border-border bg-background text-sm"
                          />
                        </td>
                        <td className="py-2 text-right">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-16 h-8 px-2 rounded border border-border bg-background text-sm text-right"
                          />
                        </td>
                        <td className="py-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.price}
                            onChange={(e) => handleUpdateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                            className="w-20 h-8 px-2 rounded border border-border bg-background text-sm text-right"
                          />
                        </td>
                        <td className="py-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.discount}
                            onChange={(e) => handleUpdateItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                            className="w-20 h-8 px-2 rounded border border-border bg-background text-sm text-right"
                          />
                        </td>
                        <td className="py-2 text-right font-500">${item.total.toFixed(2)}</td>
                        <td className="py-2">
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1 hover:bg-danger-bg rounded text-danger transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Shipping Address */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={16} className="text-primary" />
              <h3 className="text-sm font-600 text-foreground">Shipping Address</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>First Name</label>
                <input
                  type="text"
                  value={shippingAddress.firstName}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, firstName: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Last Name</label>
                <input
                  type="text"
                  value={shippingAddress.lastName}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, lastName: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Company</label>
                <input
                  type="text"
                  value={shippingAddress.company}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, company: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Address Line 1</label>
                <input
                  type="text"
                  value={shippingAddress.address1}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, address1: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Address Line 2</label>
                <input
                  type="text"
                  value={shippingAddress.address2}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, address2: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>City</label>
                <input
                  type="text"
                  value={shippingAddress.city}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>State</label>
                <input
                  type="text"
                  value={shippingAddress.state}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Postal Code</label>
                <input
                  type="text"
                  value={shippingAddress.postalCode}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Country</label>
                <input
                  type="text"
                  value={shippingAddress.country}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Phone</label>
                <input
                  type="tel"
                  value={shippingAddress.phone}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Billing Address */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-primary" />
                <h3 className="text-sm font-600 text-foreground">Billing Address</h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sameAsShipping}
                  onChange={(e) => setSameAsShipping(e.target.checked)}
                  className="rounded border-border"
                />
                <span className="text-xs text-muted-foreground">Same as shipping</span>
              </label>
            </div>
            {!sameAsShipping && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>First Name</label>
                  <input
                    type="text"
                    value={billingAddress.firstName}
                    onChange={(e) => setBillingAddress({ ...billingAddress, firstName: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Last Name</label>
                  <input
                    type="text"
                    value={billingAddress.lastName}
                    onChange={(e) => setBillingAddress({ ...billingAddress, lastName: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Company</label>
                  <input
                    type="text"
                    value={billingAddress.company}
                    onChange={(e) => setBillingAddress({ ...billingAddress, company: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Address Line 1</label>
                  <input
                    type="text"
                    value={billingAddress.address1}
                    onChange={(e) => setBillingAddress({ ...billingAddress, address1: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Address Line 2</label>
                  <input
                    type="text"
                    value={billingAddress.address2}
                    onChange={(e) => setBillingAddress({ ...billingAddress, address2: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>City</label>
                  <input
                    type="text"
                    value={billingAddress.city}
                    onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>State</label>
                  <input
                    type="text"
                    value={billingAddress.state}
                    onChange={(e) => setBillingAddress({ ...billingAddress, state: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Postal Code</label>
                  <input
                    type="text"
                    value={billingAddress.postalCode}
                    onChange={(e) => setBillingAddress({ ...billingAddress, postalCode: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Country</label>
                  <input
                    type="text"
                    value={billingAddress.country}
                    onChange={(e) => setBillingAddress({ ...billingAddress, country: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Phone</label>
                  <input
                    type="tel"
                    value={billingAddress.phone}
                    onChange={(e) => setBillingAddress({ ...billingAddress, phone: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Shipping Method */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Truck size={16} className="text-primary" />
              <h3 className="text-sm font-600 text-foreground">Shipping Method</h3>
            </div>
            <div className="space-y-3">
              <div className="flex gap-3">
                {['standard', 'expedited', 'overnight', 'local_pickup'].map((method) => (
                  <label key={method} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="shippingMethod"
                      value={method}
                      checked={shippingMethod === method}
                      onChange={(e) => setShippingMethod(e.target.value)}
                      className="text-primary"
                    />
                    <span className="text-sm text-foreground capitalize">{method.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Carrier</label>
                  <input
                    type="text"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className={inputCls}
                    placeholder="USPS, FedEx, UPS"
                  />
                </div>
                <div>
                  <label className={labelCls}>Service Level</label>
                  <input
                    type="text"
                    value={serviceLevel}
                    onChange={(e) => setServiceLevel(e.target.value)}
                    className={inputCls}
                    placeholder="Priority Mail"
                  />
                </div>
                <div>
                  <label className={labelCls}>Tracking Number</label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Shipping Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Discounts & Tax */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TagIcon size={16} className="text-primary" />
              <h3 className="text-sm font-600 text-foreground">Discounts & Tax</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                    className={inputCls}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Discount Value</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Coupon Code</label>
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className={inputCls}
                    placeholder="SAVE10"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className={inputCls}
                    disabled={taxExempt}
                  />
                </div>
                <div>
                  <label className={labelCls}>Manual Tax Adjustment ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={taxAdjustment}
                    onChange={(e) => setTaxAdjustment(parseFloat(e.target.value) || 0)}
                    className={inputCls}
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer h-9">
                    <input
                      type="checkbox"
                      checked={taxExempt}
                      onChange={(e) => setTaxExempt(e.target.checked)}
                      className="rounded border-border"
                    />
                    <span className="text-sm text-foreground">Tax Exempt</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={16} className="text-primary" />
              <h3 className="text-sm font-600 text-foreground">Payment</h3>
            </div>
            <div className="space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={markAsPaid}
                  onChange={(e) => setMarkAsPaid(e.target.checked)}
                  className="rounded border-border"
                />
                <span className="text-sm text-foreground">Mark as Paid</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className={inputCls}
                  >
                    <option value="credit_card">Credit Card</option>
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="store_credit">Store Credit</option>
                    <option value="gift_card">Gift Card</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Payment Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    className={inputCls}
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="authorized">Authorized</option>
                    <option value="partially_paid">Partially Paid</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendInvoice}
                  onChange={(e) => setSendInvoice(e.target.checked)}
                  className="rounded border-border"
                />
                <span className="text-sm text-foreground">Send invoice to customer</span>
              </label>
            </div>
          </div>

          {/* Order Notes & Custom Fields */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={16} className="text-primary" />
              <h3 className="text-sm font-600 text-foreground">Order Notes & Custom Fields</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Internal Notes</label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors resize-y"
                  placeholder="Add internal notes visible only to staff..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>PO Number</label>
                  <input
                    type="text"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Sales Rep</label>
                  <input
                    type="text"
                    value={salesRep}
                    onChange={(e) => setSalesRep(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Customer Reference</label>
                  <input
                    type="text"
                    value={customerReference}
                    onChange={(e) => setCustomerReference(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Warehouse Notes</label>
                  <input
                    type="text"
                    value={warehouseNotes}
                    onChange={(e) => setWarehouseNotes(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column - 30% Sticky Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-600 text-foreground">Order Summary</h3>

            {/* Totals */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-500 text-foreground">${subtotal.toFixed(2)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex items-center justify-between text-danger">
                  <span>Discount</span>
                  <span className="font-500">-${discountTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-500 text-foreground">${shippingCost.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-500 text-foreground">${taxTotal.toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-2 flex items-center justify-between">
                <span className="font-600 text-foreground">Total</span>
                <span className="font-600 text-lg text-foreground">${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Customer Summary */}
            {customer.email && (
              <div className="border-t border-border pt-4">
                <p className="text-xs font-500 text-muted-foreground mb-2">Customer</p>
                <div className="space-y-1">
                  <p className="text-sm font-500 text-foreground">{customer.name || 'No name'}</p>
                  <p className="text-xs text-muted-foreground">{customer.email}</p>
                  {customer.phone && <p className="text-xs text-muted-foreground">{customer.phone}</p>}
                </div>
              </div>
            )}

            {/* Payment Status */}
            <div className="border-t border-border pt-4">
              <p className="text-xs font-500 text-muted-foreground mb-2">Payment Status</p>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-500 ${
                markAsPaid || paymentStatus === 'paid'
                  ? 'bg-success-bg text-success'
                  : paymentStatus === 'authorized'
                  ? 'bg-info-bg text-info'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {markAsPaid || paymentStatus === 'paid' ? 'Paid' : paymentStatus === 'authorized' ? 'Authorized' : 'Pending'}
              </span>
            </div>

            {/* Fulfillment Status */}
            <div className="border-t border-border pt-4">
              <p className="text-xs font-500 text-muted-foreground mb-2">Fulfillment Status</p>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-500 bg-muted text-muted-foreground">
                Unfulfilled
              </span>
            </div>

            {/* Action Buttons */}
            <div className="border-t border-border pt-4 space-y-2">
              <button
                onClick={() => handleSubmit(false)}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-foreground text-background text-sm font-600 hover:bg-foreground/90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Create Order
                  </>
                )}
              </button>
              <button
                onClick={() => handleSubmit(true)}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-border text-sm font-500 hover:bg-muted transition-colors disabled:opacity-50"
              >
                <Save size={16} />
                Save as Draft
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
