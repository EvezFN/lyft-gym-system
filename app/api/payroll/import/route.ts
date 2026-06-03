import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { createClient } from '../../../../utils/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'Excel payroll payload source file missing' }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
    
    const targetSheetName = 'April Payroll-Final';
    const targetSheet = workbook.Sheets[targetSheetName];
    if (!targetSheet) return NextResponse.json({ error: `Sheet parsing error: "${targetSheetName}" not located.` }, { status: 404 });

    const rawMatrix = XLSX.utils.sheet_to_json(targetSheet, { header: 1 }) as any[][];
    const dataRecordsLines = rawMatrix.slice(3);
    const processedPayrollItems = [];

    for (const row of dataRecordsLines) {
      const name = row[0]; 
      
      if (!name || name.trim() === '' || name.toLowerCase().includes('total')) continue;

      const gross = parseFloat(row[30]) || 0; 
      const nis = parseFloat(row[32]) || 0;   
      const paye = parseFloat(row[34]) || 0;  
      const net = parseFloat(row[35]) || 0;   

      if (nis === 0 && paye === 0) continue;

      processedPayrollItems.push({
        employee_name: name.trim(),
        gross_salary: gross,
        nis_contribution: nis,
        paye_deduction: paye,
        net_pay: net,
        payment_frequency: 'Paid Fortnightly',
        payroll_cycle_date: new Date('2026-04-30').toISOString().split('T')[0]
      });
    }

    const supabase = createClient();
    const { error: insertErr } = await supabase.from('payroll_records').insert(processedPayrollItems);
    if (insertErr) throw insertErr;

    return NextResponse.json({ success: true, count: processedPayrollItems.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
