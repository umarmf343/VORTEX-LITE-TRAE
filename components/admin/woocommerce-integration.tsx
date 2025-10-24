"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Plus, Trash2, Edit2 } from "lucide-react"
import type { WooCommerceProduct } from "@/lib/types"

interface WooCommerceIntegrationProps {
  propertyId: string
  products?: WooCommerceProduct[]
  onAddProduct?: (product: WooCommerceProduct) => void
  onRemoveProduct?: (productId: string) => void
}

export function WooCommerceIntegration({
  propertyId,
  products = [],
  onAddProduct,
  onRemoveProduct,
}: WooCommerceIntegrationProps) {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: "", price: 0, sku: "", image: "" })
  const [connected, setConnected] = useState(false)

  const handleConnect = () => {
    setConnected(true)
    alert("WooCommerce store connected successfully!")
  }

  const handleAddProduct = () => {
    if (formData.name && formData.price > 0) {
      const newProduct: WooCommerceProduct = {
        id: `product-${Date.now()}`,
        propertyId,
        ...formData,
      }
      onAddProduct?.(newProduct)
      setFormData({ name: "", price: 0, sku: "", image: "" })
      setShowForm(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="font-semibold text-lg">WooCommerce Integration</h3>
              <p className="text-sm text-gray-600">Connect your store and add products to hotspots</p>
            </div>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-sm font-medium ${connected ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
          >
            {connected ? "Connected" : "Not Connected"}
          </div>
        </div>

        {!connected && (
          <Button onClick={handleConnect} className="w-full gap-2">
            <ShoppingCart className="w-4 h-4" />
            Connect WooCommerce Store
          </Button>
        )}
      </Card>

      {connected && (
        <>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Products</h3>
              <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Product
              </Button>
            </div>

            {showForm && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
                <input
                  type="text"
                  placeholder="Product Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number.parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
                <input
                  type="text"
                  placeholder="SKU"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
                <input
                  type="text"
                  placeholder="Image URL"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
                <div className="flex gap-2">
                  <Button onClick={handleAddProduct} className="flex-1">
                    Add Product
                  </Button>
                  <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {products.length === 0 ? (
                <p className="text-gray-500 text-sm">No products added yet</p>
              ) : (
                products.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center gap-3 flex-1">
                      {product.image && (
                        <img
                          src={product.image || "/placeholder.svg"}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${product.price.toFixed(2)}</p>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" className="gap-1 bg-transparent">
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onRemoveProduct?.(product.id)}
                          className="gap-1 text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
