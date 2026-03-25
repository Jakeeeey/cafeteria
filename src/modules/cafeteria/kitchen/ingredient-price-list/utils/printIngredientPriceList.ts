import type { Ingredient } from "../types"

/**
 * Generates an HTML printout of the current ingredient price list.
 * Uses a hidden iframe to trigger the print dialog without opening a new visible window.
 */
export function printIngredientPriceList(ingredients: Ingredient[]) {
    const rows = ingredients.map((item, index) => `
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px; text-align: center;">${index + 1}</td>
            <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px;"><strong>${item.name}</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px;">${item.description ?? "—"}</td>
            <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px;">${item.category_name ?? "—"}</td>
            <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px;">${item.brand_name ?? "—"}</td>
            <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px;">${item.unit_abbreviation ?? item.unit_name ?? "—"}</td>
            <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px; text-align: center;">${item.unit_count}</td>
            <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px; text-align: right; font-weight: 600;">
                &#8369;${Number(item.cost_per_unit).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
        </tr>
    `).join("")

    const printTime = new Date().toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short"
    })

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ingredient Price List - ${printTime}</title>
    <style>
        @page { size: landscape; margin: 10mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
        body { font-family: 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #111; padding: 0; line-height: 1.3; }
        .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
        .header h1 { font-size: 20px; color: #1e40af; letter-spacing: -0.5px; margin: 0; }
        .header p { margin: 2px 0 0; color: #666; font-size: 12px; }
        .print-info { text-align: right; color: #6b7280; font-size: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed; }
        th { border: 1px solid #ddd; padding: 8px; text-align: left; background: #f8fafc; font-weight: 600; font-size: 10px; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; }
        td { border: 1px solid #ddd; padding: 8px; vertical-align: top; word-wrap: break-word; }
        tr:nth-child(even) { background-color: #fcfcfc; }
        .footer { margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px; text-align: center; color: #94a3b8; font-size: 9px; }
        .total-summary { text-align: right; margin-top: 15px; font-weight: 600; color: #64748b; font-size: 11px; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>Ingredient Price List</h1>
            <p>Master price directory for active kitchen ingredients</p>
        </div>
        <div class="print-info">
            Generated on:<br/>
            <strong>${printTime}</strong>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 4%; text-align: center;">No.</th>
                <th style="width: 14%">Name</th>
                <th style="width: 19%">Description</th>
                <th style="width: 14%">Category</th>
                <th style="width: 12%">Brand</th>
                <th style="width: 10%">Unit of Measure</th>
                <th style="width: 9%; text-align: center;">Unit Count</th>
                <th style="width: 13%; text-align: right;">Cost per unit</th>
            </tr>
        </thead>
        <tbody>
            ${rows || `<tr><td colspan="8" style="text-align:center;padding:30px;color:#94a3b8;font-style:italic">No ingredients match the current filters.</td></tr>`}
        </tbody>
    </table>

    <div class="total-summary">
        Total Items Listed: ${ingredients.length}
    </div>

    <div class="footer">
        &copy; ${new Date().getFullYear()} Cafeteria Management System | Internal Master Price List
    </div>
</body>
</html>`

    // Temporarily replace the page title so the printed PDF gets the right filename
    const originalTitle = document.title
    document.title = `Ingredient Price List - ${printTime}`

    const iframe = document.createElement("iframe")
    iframe.style.position = "fixed"
    iframe.style.right = "-1000px"
    iframe.style.bottom = "-1000px"
    iframe.style.width = "0"
    iframe.style.height = "0"
    iframe.style.border = "none"
    iframe.style.visibility = "hidden"
    iframe.title = "Print Frame"
    
    document.body.appendChild(iframe)
    
    const doc = iframe.contentWindow?.document
    if (doc) {
        doc.open()
        doc.write(html)
        doc.close()
    }

    // Wait for the iframe's content to process before triggering the blocking print dialog
    setTimeout(() => {
        if (iframe.contentWindow) {
            iframe.contentWindow.focus()
            iframe.contentWindow.print()
        }
        
        // Restore title immediately after print dialogue is closed or cancelled
        document.title = originalTitle
        
        // Cleanup the hidden iframe
        setTimeout(() => {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        }, 1000); 
    }, 500); 
}
