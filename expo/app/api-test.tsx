import React, { useState } from 'react';
import { View, Text, Button, Platform } from 'react-native';

export default function ApiTest() {
  const [status, setStatus] = useState<'idle'|'loading'|'ok'|'error'>('idle');
  const [body, setBody] = useState<string>('');
  async function hit(path: string) {
    try {
      setStatus('loading');
      setBody('');
      const res = await fetch(path, { headers: { 'cache-control': 'no-cache' } });
      const txt = await res.text();
      setBody(`HTTP ${res.status}\n\n${txt}`);
      setStatus(res.ok ? 'ok' : 'error');
    } catch (e: any) {
      setStatus('error');
      setBody(String(e?.message || e));
    }
  }
  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>API Test</Text>
      <Button title="GET /api" onPress={() => hit('/api')} />
      <Button title="GET /api/ping" onPress={() => hit('/api/ping')} />
      <Text style={{ marginTop: 12, fontFamily: Platform.select({ web: 'monospace', default: undefined }) }}>
        Status: {status}
      </Text>
      <Text style={{ marginTop: 8, fontFamily: Platform.select({ web: 'monospace', default: undefined }) }}>
        {body || '—'}
      </Text>
    </View>
  );
}
