import type { ReactNode } from 'react';
import { App as AntdApp, ConfigProvider, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { UserConfigProvider, useUserConfig } from '@/models/useUserConfig';
import './global.less';

function ThemedRoot({ children }: { children: ReactNode }) {
  const { theme } = useUserConfig();
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#2563eb',
          colorSuccess: '#16a34a',
          colorError: '#dc2626',
          colorWarning: '#d97706',
          colorBgLayout: theme === 'dark' ? '#0b1220' : '#f8fafc',
          colorBgContainer: theme === 'dark' ? '#111827' : '#ffffff',
          colorBorder: theme === 'dark' ? '#1f2937' : '#e2e8f0',
          colorText: theme === 'dark' ? '#e5e7eb' : '#0f172a',
          colorTextSecondary: theme === 'dark' ? '#94a3b8' : '#64748b',
          borderRadius: 8,
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
        },
        components: {
          Button: { controlHeight: 34, borderRadius: 8 },
          Segmented: { itemSelectedBg: theme === 'dark' ? '#1e293b' : '#eef2ff' },
          Tabs: { horizontalItemGutter: 20, titleFontSize: 13 },
          Tooltip: { fontSize: 12 },
          Modal: { borderRadiusLG: 14 },
        },
      }}
    >
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
}

export function rootContainer(container: ReactNode) {
  return (
    <UserConfigProvider>
      <ThemedRoot>{container}</ThemedRoot>
    </UserConfigProvider>
  );
}
