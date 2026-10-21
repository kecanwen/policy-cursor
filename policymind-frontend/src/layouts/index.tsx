import {
  BookOutlined,
  BugOutlined,
  EditOutlined,
  ExperimentOutlined,
  MoonOutlined,
  ReadOutlined,
  SunOutlined,
} from '@ant-design/icons';
import { Tooltip } from 'antd';
import { Outlet, history, useLocation } from 'umi';
import { useUserConfig } from '@/models/useUserConfig';

const navItems = [
  { key: '/workspace', label: '申论工作台', icon: <EditOutlined /> },
  { key: '/xingce', label: '行测 Debugger', icon: <ExperimentOutlined /> },
  { key: '/bank', label: '真题库', icon: <BookOutlined /> },
  { key: '/mistakes', label: '错题集', icon: <BugOutlined /> },
  { key: '/dictionary', label: '公文词典', icon: <ReadOutlined /> },
];

export default function GlobalLayout() {
  const location = useLocation();
  const { theme, toggleTheme } = useUserConfig();

  return (
    <div className="pm-shell">
      <aside className="pm-rail">
        <Tooltip title="PolicyMind · 公考 IDE" placement="right">
          <div className="pm-rail__logo">政</div>
        </Tooltip>
        <nav className="pm-rail__nav">
          {navItems.map((item) => (
            <Tooltip key={item.key} title={item.label} placement="right">
              <div
                className={`pm-rail__item ${
                  location.pathname.startsWith(item.key) ? 'is-active' : ''
                }`}
                onClick={() => history.push(item.key)}
                role="button"
                tabIndex={0}
              >
                {item.icon}
              </div>
            </Tooltip>
          ))}
        </nav>
        <div className="pm-rail__foot">
          <Tooltip title={theme === 'dark' ? '切换浅色' : '切换深色'} placement="right">
            <div className="pm-rail__item" onClick={toggleTheme} role="button" tabIndex={0}>
              {theme === 'dark' ? <SunOutlined /> : <MoonOutlined />}
            </div>
          </Tooltip>
          <Tooltip title="本地工作区" placement="right">
            <div className="pm-rail__avatar">KW</div>
          </Tooltip>
        </div>
      </aside>
      <main className="pm-main">
        <Outlet />
      </main>
    </div>
  );
}
