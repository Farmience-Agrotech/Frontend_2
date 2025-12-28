import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.tsx';
import { Avatar, AvatarFallback } from '@/components/ui/avatar.tsx';
import { Camera, User, Settings as SettingsIcon, Building2, Landmark, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast.ts';
import { UsersRolesTab } from '@/components/settings/UsersRolesTab.tsx';
import { usePermissions } from '@/hooks/usePermissions.ts';

export default function Settings() {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  const canViewUserManagement = hasPermission('userManagement', 'view');
  
  const [notifications, setNotifications] = useState({
    newQuotes: true,
    orderUpdates: true,
    lowStock: true,
    paymentReceived: false,
  });

  const handleSave = (section: string) => {
    toast({
      title: "Settings saved",
      description: `Your ${section} have been updated successfully.`,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your account and application preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4 hidden sm:block" />
              My Profile
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2">
              <SettingsIcon className="h-4 w-4 hidden sm:block" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="company" className="gap-2">
              <Building2 className="h-4 w-4 hidden sm:block" />
              Company Info
            </TabsTrigger>
            <TabsTrigger value="bank" className="gap-2">
              <Landmark className="h-4 w-4 hidden sm:block" />
              Bank Details
            </TabsTrigger>
            {/* {canViewUserManagement && (
              <TabsTrigger value="users-roles" className="gap-2">
                <Shield className="h-4 w-4 hidden sm:block" />
                Users & Roles
              </TabsTrigger>
            )} */}
          </TabsList>

          {/* Tab 1: My Profile */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>My Profile</CardTitle>
                <CardDescription>Update your personal information and password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Upload */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xl">AK</AvatarFallback>
                    </Avatar>
                    <Button size="icon" variant="secondary" className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full">
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                  <div>
                    <p className="font-medium">Profile Photo</p>
                    <p className="text-sm text-muted-foreground">JPG, PNG or GIF. Max 2MB</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" defaultValue="Arun Kumar" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue="arun.kumar@company.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" defaultValue="+91 98765 43210" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Designation / Role</Label>
                    <Input id="role" defaultValue="Admin" disabled className="bg-muted" />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-medium mb-4">Change Password</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input id="currentPassword" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input id="newPassword" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input id="confirmPassword" type="password" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => handleSave('profile settings')}>Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Preferences */}
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Customize your application experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Theme Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Theme</Label>
                    <p className="text-sm text-muted-foreground">Switch between light and dark mode</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={theme === 'light' ? 'font-medium' : 'text-muted-foreground'}>Light</span>
                    <Switch
                      checked={theme === 'dark'}
                      onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                    />
                    <span className={theme === 'dark' ? 'font-medium' : 'text-muted-foreground'}>Dark</span>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-medium mb-4">Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>New Quote Requests</Label>
                        <p className="text-sm text-muted-foreground">Get notified when you receive a new quote request</p>
                      </div>
                      <Switch
                        checked={notifications.newQuotes}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, newQuotes: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Order Updates</Label>
                        <p className="text-sm text-muted-foreground">Get notified on order status changes</p>
                      </div>
                      <Switch
                        checked={notifications.orderUpdates}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, orderUpdates: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Low Stock Alerts</Label>
                        <p className="text-sm text-muted-foreground">Get alerts when products are running low</p>
                      </div>
                      <Switch
                        checked={notifications.lowStock}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, lowStock: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Payment Received</Label>
                        <p className="text-sm text-muted-foreground">Get notified when payments are received</p>
                      </div>
                      <Switch
                        checked={notifications.paymentReceived}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, paymentReceived: checked })}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Language</Label>
                      <p className="text-sm text-muted-foreground">Select your preferred language</p>
                    </div>
                    <Select defaultValue="en">
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => handleSave('preferences')}>Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Company Info */}
          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>Update your company details and address</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Upload */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center border-2 border-dashed border-border">
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <Button size="icon" variant="secondary" className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full">
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                  <div>
                    <p className="font-medium">Company Logo</p>
                    <p className="text-sm text-muted-foreground">JPG, PNG or SVG. Recommended 200x200px</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input id="companyName" defaultValue="Industrial Supplies Pvt. Ltd." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gst">GST Number</Label>
                    <Input id="gst" defaultValue="27AABCU9603R1ZM" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pan">PAN Number</Label>
                    <Input id="pan" defaultValue="AABCU9603R" />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-medium mb-4">Address</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="street">Street Address</Label>
                      <Input id="street" defaultValue="123, Industrial Area, Phase II" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" defaultValue="Mumbai" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input id="state" defaultValue="Maharashtra" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pin">PIN Code</Label>
                      <Input id="pin" defaultValue="400001" />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-medium mb-4">Contact Details</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="companyPhone">Phone</Label>
                      <Input id="companyPhone" defaultValue="+91 22 2345 6789" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyEmail">Email</Label>
                      <Input id="companyEmail" type="email" defaultValue="info@industrialsupplies.com" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="website">Website</Label>
                      <Input id="website" defaultValue="www.industrialsupplies.com" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => handleSave('company information')}>Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Bank Details */}
          <TabsContent value="bank">
            <Card>
              <CardHeader>
                <CardTitle>Bank Details</CardTitle>
                <CardDescription>Manage your bank account information for payments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="accountHolder">Account Holder Name</Label>
                    <Input id="accountHolder" defaultValue="Industrial Supplies Pvt. Ltd." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input id="accountNumber" defaultValue="1234567890123456" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ifsc">IFSC Code</Label>
                    <Input id="ifsc" defaultValue="HDFC0001234" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input id="bankName" defaultValue="HDFC Bank" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="upi">UPI ID (Optional)</Label>
                    <Input id="upi" defaultValue="industrialsupplies@hdfcbank" placeholder="yourname@upi" />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => handleSave('bank details')}>Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 5: Users & Roles */}
          {/* {canViewUserManagement && (
            <TabsContent value="users-roles">
              <UsersRolesTab />
            </TabsContent>
          )} */}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
