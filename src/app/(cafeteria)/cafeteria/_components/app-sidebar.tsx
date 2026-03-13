// src/app/(financial-management)/fm/_components/app-sidebar.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
    LayoutDashboard,
    Landmark,
    PiggyBank as BudgetingIcon,
    HandCoins as DisbursementIcon,
    ArrowLeftRight,
    LayoutDashboard as SubDashboardIcon,
    BadgeCheck,
    FolderKanban,
    BarChart3,
} from "lucide-react";

import { NavMain } from "./nav-main";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";

const data = {
    navMain: [
        { title: "Dashboard", url: "/cafeteria/", icon: LayoutDashboard },
         {
            title: "File Management",
            url: "#",
            icon: Landmark,
            items: 
            [
                { 
                    title: "Brand Registration", 
                    url: "/cafeteria/file-management/brand-registration", 
                },
                 { 
                    title: "Category Registration", 
                    url: "/cafeteria/file-management/category-registration", 
                },
            ],
        },
        {
            title: "Kitchen (Admin)",
            url: "#",
            icon: Landmark,
            items: 
            [
                { 
                    title: "Ingredient Registration", 
                    url: "/cafeteria/kitchen/ingredient-registration", 
                },
                { 
                    title: "Ingredient Price Change Request", 
                    url: "/cafeteria/kitchen/ingredient-price-change-request", 
                },
                { 
                    title: "Ingredient Price Approval", 
                    url: "/cafeteria/kitchen/ingredient-price-approval", 
                },
                { 
                    title: "Ingredient Price List", 
                    url: "/cafeteria/kitchen/ingredient-price-list", 
                },
                 { 
                    title: "Product Meal Registration", 
                    url: "/cafeteria/kitchen/product-meal-registration", 
                },
                { 
                    title: "Meal Schedule Registration", 
                    url: "/cafeteria/kitchen/meal-schedule-registration", 
                },
                { 
                    title: "Meal Purchase Order Approval", 
                    url: "/cafeteria/kitchen/meal-purchase-order-approval", 
                },
            ],
        },
        {
            title: "KIOSK",
            url: "#",
            icon: Landmark,
            items: 
            [
                { 
                    title: "User Login RFID", 
                    url: "/cafeteria/kiosk/user-login-rfid", 
                },
                { 
                    title: "Menu", 
                    url: "/cafeteria/kiosk/menu", 
                },
                { 
                    title: "Confirm Order", 
                    url: "/cafeteria/kiosk/confirm-order", 
                },
            ],
        },
        {
            title: "Kitchen Order",
            url: "#",
            icon: Landmark,
            items: 
            [
                { 
                    title: "Order List", 
                    url: "/cafeteria/kitchen-order/order-list", 
                },
            ],
        },
        {
            title: "Sales Report",
            url: "#",
            icon: Landmark,
            items: 
            [
                { 
                    title: "Per Day Report", 
                    url: "/cafeteria/sales-report/per-day-report", 
                },
                { 
                    title: "Per Employee Report", 
                    url: "/cafeteria/sales-report/per-employee-report", 
                },
            ],
        },
        // {
        //     title: "Ingredient Price Change Request",
        //     url: "#",
        //     icon: Landmark,
        //     items: 
        //     [
        //         { 
        //             title: "Per Day Report", 
        //             url: "/cafeteria/sales-report/per-day-report", 
        //         },
        //         { 
        //             title: "Per Employee Report", 
        //             url: "/cafeteria/sales-report/per-employee-report", 
        //         },
        //         // {
        //         //     title: "Budgeting",
        //         //     url: "#",
        //         //     icon: BudgetingIcon,
        //         //     items: [
        //         //         { title: "Dashboard", url: "/fm/treasury/budgeting/dashboard", icon: SubDashboardIcon },
        //         //         { title: "Budget Approvals", url: "/fm/treasury/budgeting/budget-approvals", icon: BadgeCheck },
        //         //         { title: "Budget Records", url: "/fm/treasury/budgeting/budget-records", icon: FolderKanban },
        //         //         { title: "Reports", url: "/fm/treasury/budgeting/reports", icon: BarChart3 },
        //         //     ],
        //         // },
        //     ],
        // },
    ],
};

export function AppSidebar({ className, ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar
            {...props}
            className={cn(
                // ✅ brighter border in dark mode
                "border-r border-sidebar-border/60 dark:border-white/20",

                // ✅ keep premium depth; add a subtle highlight ring in dark
                "shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.10),0_16px_40px_-24px_rgba(0,0,0,0.9)]",

                className
            )}
        >
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/main-dashboard">
                                <div className="flex aspect-square size-10 items-center justify-center overflow-hidden">
                                    <Image
                                        src="/vertex_logo_black.png"
                                        alt="VOS Logo"
                                        width={40}
                                        height={40}
                                        className="h-9 w-10 object-contain"
                                        priority
                                    />
                                </div>

                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">VOS Web</span>
                                    <span className="truncate text-xs text-muted-foreground">Cafeteria</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <Separator />

            <SidebarContent>
                <div className="px-4 pt-3 pb-2 text-xs font-medium text-muted-foreground">Platform</div>

                <ScrollArea
                    className={cn(
                        "min-h-0 flex-1",
                        "[&_[data-radix-scroll-area-viewport]>div]:block",
                        "[&_[data-radix-scroll-area-viewport]>div]:w-full",
                        "[&_[data-radix-scroll-area-viewport]>div]:min-w-0"
                    )}
                >
                    <div className="w-full min-w-0">
                        <NavMain items={data.navMain} />
                    </div>
                </ScrollArea>
            </SidebarContent>

            <SidebarFooter className="p-0">
                <Separator />
                <div className="py-3 text-center text-xs text-muted-foreground">VOS Web v2.0</div>
            </SidebarFooter>
        </Sidebar>
    );
}
