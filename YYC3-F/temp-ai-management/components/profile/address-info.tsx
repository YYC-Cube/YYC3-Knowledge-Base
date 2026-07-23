"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { MapPin, Home, Building, Plus, Edit, Trash2, Save, CheckCircle, AlertCircle, Star } from "lucide-react"

interface Address {
  id: string
  type: "home" | "work" | "billing" | "shipping" | "other"
  label: string
  isDefault: boolean
  recipient: string
  phone: string
  country: string
  province: string
  city: string
  district: string
  street: string
  postalCode: string
  detailAddress: string
  notes?: string
}

export function AddressInfo() {
  const [addresses, setAddresses] = useState<Address[]>([
    {
      id: "1",
      type: "home",
      label: "家庭地址",
      isDefault: true,
      recipient: "张三",
      phone: "+86 138-0013-8001",
      country: "中国",
      province: "北京市",
      city: "北京市",
      district: "朝阳区",
      street: "建国路",
      postalCode: "100020",
      detailAddress: "SOHO现代城A座1001室",
      notes: "工作日18:00后可收货",
    },
    {
      id: "2",
      type: "work",
      label: "公司地址",
      isDefault: false,
      recipient: "张三",
      phone: "+86 138-0013-8001",
      country: "中国",
      province: "北京市",
      city: "北京市",
      district: "海淀区",
      street: "中关村大街",
      postalCode: "100080",
      detailAddress: "科技大厦B座15层",
      notes: "工作时间9:00-18:00",
    },
  ])

  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle")
  const [showAddForm, setShowAddForm] = useState(false)

  const [newAddress, setNewAddress] = useState<Partial<Address>>({
    type: "home",
    label: "",
    recipient: "",
    phone: "",
    country: "中国",
    province: "",
    city: "",
    district: "",
    street: "",
    postalCode: "",
    detailAddress: "",
    notes: "",
  })

  const addressTypes = [
    { value: "home", label: "家庭地址", icon: Home },
    { value: "work", label: "工作地址", icon: Building },
    { value: "billing", label: "账单地址", icon: MapPin },
    { value: "shipping", label: "收货地址", icon: MapPin },
    { value: "other", label: "其他地址", icon: MapPin },
  ]

  const provinces = [
    "北京市",
    "上海市",
    "天津市",
    "重庆市",
    "河北省",
    "山西省",
    "辽宁省",
    "吉林省",
    "黑龙江省",
    "江苏省",
    "浙江省",
    "安徽省",
    "福建省",
    "江西省",
    "山东省",
    "河南省",
    "湖北省",
    "湖南省",
    "广东省",
    "海南省",
    "四川省",
    "贵州省",
    "云南省",
    "陕西省",
    "甘肃省",
    "青海省",
    "内蒙古自治区",
    "广西壮族自治区",
    "西藏自治区",
    "宁夏回族自治区",
    "新疆维吾尔自治区",
    "香港特别行政区",
    "澳门特别行政区",
    "台湾省",
  ]

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // 模拟保存操作
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setSaveStatus("success")
      setTimeout(() => setSaveStatus("idle"), 3000)
    } catch (error) {
      setSaveStatus("error")
      setTimeout(() => setSaveStatus("idle"), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddAddress = () => {
    if (newAddress.label && newAddress.recipient && newAddress.phone) {
      const address: Address = {
        id: Date.now().toString(),
        type: newAddress.type as Address["type"],
        label: newAddress.label,
        isDefault: addresses.length === 0,
        recipient: newAddress.recipient,
        phone: newAddress.phone,
        country: newAddress.country || "中国",
        province: newAddress.province || "",
        city: newAddress.city || "",
        district: newAddress.district || "",
        street: newAddress.street || "",
        postalCode: newAddress.postalCode || "",
        detailAddress: newAddress.detailAddress || "",
        notes: newAddress.notes || "",
      }

      setAddresses([...addresses, address])
      setNewAddress({
        type: "home",
        label: "",
        recipient: "",
        phone: "",
        country: "中国",
        province: "",
        city: "",
        district: "",
        street: "",
        postalCode: "",
        detailAddress: "",
        notes: "",
      })
      setShowAddForm(false)
    }
  }

  const handleDeleteAddress = (id: string) => {
    setAddresses(addresses.filter((addr) => addr.id !== id))
  }

  const handleSetDefault = (id: string) => {
    setAddresses(
      addresses.map((addr) => ({
        ...addr,
        isDefault: addr.id === id,
      })),
    )
  }

  const getAddressTypeInfo = (type: Address["type"]) => {
    return addressTypes.find((t) => t.value === type) || addressTypes[0]
  }

  const formatAddress = (address: Address) => {
    return `${address.country} ${address.province} ${address.city} ${address.district} ${address.street} ${address.detailAddress}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">地址信息</h2>
          <p className="text-muted-foreground">管理您的收货地址和联系地址</p>
        </div>
        <div className="flex items-center space-x-2">
          {saveStatus === "success" && (
            <div className="flex items-center text-green-600">
              <CheckCircle className="h-4 w-4 mr-1" />
              <span className="text-sm">保存成功</span>
            </div>
          )}
          {saveStatus === "error" && (
            <div className="flex items-center text-red-600">
              <AlertCircle className="h-4 w-4 mr-1" />
              <span className="text-sm">保存失败</span>
            </div>
          )}
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            添加地址
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "保存中..." : "保存更改"}
          </Button>
        </div>
      </div>

      {/* 地址列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {addresses.map((address) => {
          const typeInfo = getAddressTypeInfo(address.type)
          const IconComponent = typeInfo.icon

          return (
            <Card key={address.id} className={address.isDefault ? "ring-2 ring-primary" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <IconComponent className="h-5 w-5" />
                    <CardTitle className="text-lg">{address.label}</CardTitle>
                    {address.isDefault && (
                      <Badge className="bg-primary">
                        <Star className="h-3 w-3 mr-1" />
                        默认
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(address.id)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAddress(address.id)}
                      disabled={address.isDefault}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>{typeInfo.label}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{address.recipient}</span>
                    <span className="text-sm text-muted-foreground">{address.phone}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatAddress(address)}</p>
                  <p className="text-sm text-muted-foreground">邮编: {address.postalCode}</p>
                  {address.notes && <p className="text-sm text-muted-foreground">备注: {address.notes}</p>}
                </div>

                {!address.isDefault && (
                  <Button variant="outline" size="sm" onClick={() => handleSetDefault(address.id)} className="w-full">
                    设为默认地址
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 添加地址表单 */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>添加新地址</CardTitle>
            <CardDescription>填写完整的地址信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>地址类型</Label>
                <Select
                  value={newAddress.type}
                  onValueChange={(value) => setNewAddress({ ...newAddress, type: value as Address["type"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {addressTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center">
                          <type.icon className="h-4 w-4 mr-2" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>地址标签</Label>
                <Input
                  placeholder="如：家、公司、朋友家"
                  value={newAddress.label}
                  onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>收件人</Label>
                <Input
                  placeholder="收件人姓名"
                  value={newAddress.recipient}
                  onChange={(e) => setNewAddress({ ...newAddress, recipient: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>联系电话</Label>
                <Input
                  placeholder="手机号码"
                  value={newAddress.phone}
                  onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>国家/地区</Label>
                <Select
                  value={newAddress.country}
                  onValueChange={(value) => setNewAddress({ ...newAddress, country: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="中国">中国</SelectItem>
                    <SelectItem value="香港">香港</SelectItem>
                    <SelectItem value="澳门">澳门</SelectItem>
                    <SelectItem value="台湾">台湾</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>省/直辖市</Label>
                <Select
                  value={newAddress.province}
                  onValueChange={(value) => setNewAddress({ ...newAddress, province: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择省份" />
                  </SelectTrigger>
                  <SelectContent>
                    {provinces.map((province) => (
                      <SelectItem key={province} value={province}>
                        {province}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>市</Label>
                <Input
                  placeholder="城市"
                  value={newAddress.city}
                  onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>区/县</Label>
                <Input
                  placeholder="区县"
                  value={newAddress.district}
                  onChange={(e) => setNewAddress({ ...newAddress, district: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>街道</Label>
                <Input
                  placeholder="街道名称"
                  value={newAddress.street}
                  onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>邮政编码</Label>
                <Input
                  placeholder="邮编"
                  value={newAddress.postalCode}
                  onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>详细地址</Label>
              <Input
                placeholder="门牌号、楼层、房间号等"
                value={newAddress.detailAddress}
                onChange={(e) => setNewAddress({ ...newAddress, detailAddress: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>备注信息</Label>
              <Textarea
                placeholder="收货时间、特殊要求等"
                value={newAddress.notes}
                onChange={(e) => setNewAddress({ ...newAddress, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                取消
              </Button>
              <Button onClick={handleAddAddress}>
                <Plus className="h-4 w-4 mr-2" />
                添加地址
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
