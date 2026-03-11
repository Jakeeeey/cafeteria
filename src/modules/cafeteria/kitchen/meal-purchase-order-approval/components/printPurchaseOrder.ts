import type { PurchaseOrder, PurchaseOrderItem, POScheduleEntry } from "../types"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const
const MEAL_TYPES = ["Breakfast", "Lunch", "Snack"] as const

function formatDate(dateStr: string): string {
    const d = new Date(dateStr)
    return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
}

export function printPurchaseOrder(
    order: PurchaseOrder,
    items: PurchaseOrderItem[],
    scheduleEntries: POScheduleEntry[]
) {
    // Build schedule grid data
    const grid: Record<string, Record<string, POScheduleEntry[]>> = {}
    for (const day of DAYS) {
        grid[day] = {}
        for (const mt of MEAL_TYPES) grid[day][mt] = []
    }
    for (const e of scheduleEntries) {
        if (grid[e.day_of_week]?.[e.meal_type]) {
            grid[e.day_of_week][e.meal_type].push(e)
        }
    }

    // Build week dates from date_from
    const weekDates: Record<string, string> = {}
    const [y, m, d] = order.date_from.split("-").map(Number)
    for (let i = 0; i < 6; i++) {
        const date = new Date(Date.UTC(y, m - 1, d + i))
        weekDates[DAYS[i]] = date.toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: "UTC" })
    }

    const scheduleRows = MEAL_TYPES.map(mt => `
        <tr>
            <td style="border:1px solid #ccc;padding:6px 8px;font-weight:600;white-space:nowrap;background:#f5f5f5">${mt}</td>
            ${DAYS.map(day => {
                const cell = grid[day][mt]
                return `<td style="border:1px solid #ccc;padding:6px 8px;vertical-align:top;min-width:90px">
                    ${cell.length === 0
                        ? `<span style="color:#aaa">—</span>`
                        : cell.map(e => `<div style="margin-bottom:4px"><strong>${e.meal_name}</strong><br/><span style="color:#666;font-size:11px">${e.total_servings} serving${e.total_servings !== 1 ? "s" : ""}</span></div>`).join("")
                    }
                </td>`
            }).join("")}
        </tr>
    `).join("")

    const ingredientRows = items.map(item => `
        <tr>
            <td style="border:1px solid #ccc;padding:6px 8px;font-weight:600">${item.ingredient_name}</td>
            <td style="border:1px solid #ccc;padding:6px 8px">${item.unit_abbreviation ?? item.unit_name ?? "N/A"}</td>
            <td style="border:1px solid #ccc;padding:6px 8px;text-align:right">${Number(item.required_quantity).toFixed(2)}</td>
            <td style="border:1px solid #ccc;padding:6px 8px;text-align:right">&#8369;${Number(item.estimated_cost).toFixed(2)}</td>
        </tr>
    `).join("")

    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8"/>
    <title>Purchase Order #${order.id}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 32px; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .meta { color: #555; font-size: 12px; margin-bottom: 16px; }
        .status { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; background: #e5e7eb; margin-bottom: 20px; }
        h2 { font-size: 14px; font-weight: 700; margin: 20px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .schedule-table th { border: 1px solid #ccc; padding: 6px 8px; text-align: center; background: #f5f5f5; font-weight: 600; }
        .schedule-table th:first-child { text-align: left; }
        .total-row { text-align: right; margin-top: 12px; font-size: 14px; }
        .total-row strong { font-size: 16px; }
        @media print { body { padding: 16px; } }
    </style>
</head>
<body>
    <h1>Purchase Order #${order.id}</h1>
    <p class="meta">Schedule period: ${formatDate(order.date_from)} &mdash; ${formatDate(order.date_to)}</p>
    <span class="status">${order.status}</span>

    <h2>Scheduled Meals</h2>
    <table class="schedule-table">
        <thead>
            <tr>
                <th>Meal Type</th>
                ${DAYS.map(day => `<th>${day}<br/><span style="font-weight:400;font-size:11px">${weekDates[day]}</span></th>`).join("")}
            </tr>
        </thead>
        <tbody>${scheduleRows}</tbody>
    </table>

    <h2>Required Ingredients</h2>
    <table>
        <thead>
            <tr>
                <th style="border:1px solid #ccc;padding:6px 8px;text-align:left;background:#f5f5f5">Ingredient</th>
                <th style="border:1px solid #ccc;padding:6px 8px;text-align:left;background:#f5f5f5">Unit</th>
                <th style="border:1px solid #ccc;padding:6px 8px;text-align:right;background:#f5f5f5">Required Qty</th>
                <th style="border:1px solid #ccc;padding:6px 8px;text-align:right;background:#f5f5f5">Estimated Cost</th>
            </tr>
        </thead>
        <tbody>${ingredientRows || `<tr><td colspan="4" style="border:1px solid #ccc;padding:12px;text-align:center;color:#aaa">No ingredients.</td></tr>`}</tbody>
    </table>

    <div class="total-row">
        Total Estimated Cost: <strong>&#8369;${Number(order.total_estimated_cost).toFixed(2)}</strong>
    </div>

    <script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; }</script>
</body>
</html>`

    const win = window.open("", "_blank", "width=900,height=700")
    if (win) {
        win.document.write(html)
        win.document.close()
    }
}
