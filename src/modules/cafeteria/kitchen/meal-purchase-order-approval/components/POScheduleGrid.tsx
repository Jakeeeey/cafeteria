"use client"

import React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import type { POScheduleEntry } from "../types"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const
const MEAL_TYPES = ["Breakfast", "Lunch", "Snack"] as const

interface POScheduleGridProps {
    entries: POScheduleEntry[]
    isLoading: boolean
    dateFrom: string // YYYY-MM-DD (Monday of the week)
}

function getWeekDates(dateFrom: string): Record<string, string> {
    const result: Record<string, string> = {}
    for (let i = 0; i < 6; i++) {
        // Use UTC to avoid timezone-shifting the date
        const [y, m, d] = dateFrom.split("-").map(Number)
        const date = new Date(Date.UTC(y, m - 1, d + i))
        result[DAYS[i]] = date.toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
        })
    }
    return result
}

export default function POScheduleGrid({ entries, isLoading, dateFrom }: POScheduleGridProps) {
    const weekDates = React.useMemo(() => getWeekDates(dateFrom), [dateFrom])

    // Build lookup: day_of_week + meal_type → entries[]
    const grid = React.useMemo(() => {
        const map: Record<string, Record<string, POScheduleEntry[]>> = {}
        for (const day of DAYS) {
            map[day] = {}
            for (const mt of MEAL_TYPES) {
                map[day][mt] = []
            }
        }
        for (const e of entries) {
            if (map[e.day_of_week]?.[e.meal_type]) {
                map[e.day_of_week][e.meal_type].push(e)
            }
        }
        return map
    }, [entries])

    if (isLoading) {
        return (
            <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-md" />
                ))}
            </div>
        )
    }

    return (
        <div className="overflow-x-auto">
            <table
                className="w-full border-collapse text-xs"
                style={{ minWidth: 640 }}
            >
                <thead>
                    <tr>
                        <th className="w-24 border bg-muted/50 px-2 py-2 text-left font-semibold text-muted-foreground">
                            Meal Type
                        </th>
                        {DAYS.map((day) => (
                            <th
                                key={day}
                                className="border bg-muted/50 px-2 py-2 text-center font-semibold min-w-[110px]"
                            >
                                <div>{day}</div>
                                <div className="text-[10px] font-normal text-muted-foreground">
                                    {weekDates[day]}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {MEAL_TYPES.map((mt) => (
                        <tr key={mt}>
                            <td className="border bg-muted/30 px-2 py-2 font-medium text-muted-foreground align-top whitespace-nowrap">
                                {mt}
                            </td>
                            {DAYS.map((day) => {
                                const cellEntries = grid[day][mt]
                                return (
                                    <td
                                        key={day}
                                        className="border p-1.5 align-top"
                                    >
                                        {cellEntries.length === 0 ? (
                                            <p className="text-[10px] text-muted-foreground/40 text-center mt-2 select-none">
                                                —
                                            </p>
                                        ) : (
                                            <div className="flex flex-col gap-1.5">
                                                {cellEntries.map((e) => (
                                                    <div
                                                        key={e.id}
                                                        className="flex flex-col gap-1 rounded-md border bg-card p-2 shadow-sm"
                                                    >
                                                        <span className="font-medium leading-tight line-clamp-2">
                                                            {e.meal_name}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {e.total_servings} serving{e.total_servings !== 1 ? "s" : ""}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
