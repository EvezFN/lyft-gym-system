import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../utils/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const textData = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!textData) return NextResponse.json({ status: 'No incoming data packets payload tracked' });

    const phoneNoSource = textData.from;
    const cleanBodyText = textData.text?.body?.toLowerCase().trim();

    const clockInPhrases = ['good morning', 'clock in', 'clockin'];
    const clockOutPhrases = ['clock out', 'clockout'];

    let action: 'CLOCK_IN' | 'CLOCK_OUT' | null = null;

    if (clockInPhrases.includes(cleanBodyText)) {
      action = 'CLOCK_IN';
    } else if (clockOutPhrases.includes(cleanBodyText)) {
      action = 'CLOCK_OUT';
    }

    if (action !== null) {
      const supabase = createClient();

      const { data: profile, error: matchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone_number', phoneNoSource)
        .single();

      if (matchError || !profile) {
        return NextResponse.json({ error: 'Device communication line tracking confirmation map lookup failed' }, { status: 404 });
      }

      await supabase.from('attendance_logs').insert({
        profile_id: profile.id,
        action_type: action,
        matched_word: cleanBodyText,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({ status: 'Synchronization payload tracking complete' }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
