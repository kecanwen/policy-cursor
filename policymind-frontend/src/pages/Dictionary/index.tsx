import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightOutlined,
  CopyOutlined,
  PlusOutlined,
  ReadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { App, Button, Form, Input, Modal, Segmented, Tag } from 'antd';
import { vocabCards, vocabTypes, type VocabCard } from '@/data/dictionary';
import './index.less';

const EXTRA_KEY = 'policymind:vocab-extra';

export default function DictionaryPage() {
  const { message } = App.useApp();
  const [extra, setExtra] = useState<VocabCard[]>([]);
  const [type, setType] = useState('全部');
  const [keyword, setKeyword] = useState('');
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(EXTRA_KEY) || '[]');
      setExtra(Array.isArray(stored) ? stored : []);
    } catch {
      setExtra([]);
    }
  }, []);

  const all = useMemo(() => [...extra, ...vocabCards], [extra]);
  const filtered = all.filter((card) => {
    const matchesType = type === '全部' || card.type === type;
    const query = keyword.trim();
    const matchesKeyword =
      !query ||
      card.original.includes(query) ||
      card.refactored.includes(query) ||
      card.note.includes(query);
    return matchesType && matchesKeyword;
  });

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const card: VocabCard = {
        id: `local-${Date.now()}`,
        original: values.original.trim(),
        refactored: values.refactored.trim(),
        type: values.type,
        note: values.note?.trim() || '来自本次精批的自定义表达。',
        createdAt: new Date().toISOString().slice(0, 10),
      };
      const next = [card, ...extra];
      setExtra(next);
      window.localStorage.setItem(EXTRA_KEY, JSON.stringify(next));
      form.resetFields();
      setOpen(false);
      message.success('已加入公文词典');
    } catch {
      // validation messages are shown inline
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success('已复制规范表达');
    } catch {
      message.error('复制失败，请手动选择文本');
    }
  };

  return (
    <div className="pm-page pm-dict">
      <div className="pm-page-head">
        <div>
          <div className="pm-kicker">STYLE VOCABULARY</div>
          <h1 className="pm-page-title">公文词典</h1>
          <p className="pm-page-sub">
            把“白话”与“机关语”并排放在一起。积累的不是词，而是动宾搭配和治理动作的颗粒度。
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          新建卡片
        </Button>
      </div>

      <div className="pm-dict__toolbar">
        <Segmented
          value={type}
          onChange={(value) => setType(String(value))}
          options={[...vocabTypes]}
        />
        <Input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          prefix={<SearchOutlined style={{ color: 'var(--pm-faint)' }} />}
          placeholder="搜索表达或场景"
          allowClear
          className="pm-dict__search"
        />
      </div>

      <div className="pm-dict__count">
        <ReadOutlined /> 共 <strong>{filtered.length}</strong> 条表达
        <span>· 点击卡片右上角可复制规范表达</span>
      </div>

      <div className="pm-dict__grid">
        {filtered.map((card) => (
          <article className="pm-vocab pm-card" key={card.id}>
            <div className="pm-vocab__head">
              <Tag bordered={false} className="pm-tag pm-tag--blue">
                {card.type}
              </Tag>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => copy(card.refactored)}
              />
            </div>
            <div className="pm-vocab__line pm-vocab__line--before">
              <span>口语</span>
              <p>{card.original}</p>
            </div>
            <div className="pm-vocab__arrow">
              <ArrowRightOutlined />
            </div>
            <div className="pm-vocab__line pm-vocab__line--after pm-essay">
              <span>机关语</span>
              <p>{card.refactored}</p>
            </div>
            <p className="pm-vocab__note">{card.note}</p>
            <span className="pm-vocab__date">{card.createdAt}</span>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="pm-dict__empty">
          <ReadOutlined />
          <span>还没有这类表达，新建一张卡片吧。</span>
        </div>
      )}

      <Modal
        title="新建公文表达卡片"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleCreate}
        okText="保存到词典"
        cancelText="取消"
        width={520}
      >
        <Form form={form} layout="vertical" initialValues={{ type: '动宾搭配' }}>
          <Form.Item
            name="original"
            label="口语 / 白话原句"
            rules={[{ required: true, message: '请输入原句' }]}
          >
            <Input.TextArea rows={2} placeholder="例如：搞好部门之间的沟通" />
          </Form.Item>
          <Form.Item
            name="refactored"
            label="规范公文表达"
            rules={[{ required: true, message: '请输入规范表达' }]}
          >
            <Input.TextArea rows={2} placeholder="例如：健全跨部门统筹协调机制" />
          </Form.Item>
          <Form.Item name="type" label="表达类型">
            <Segmented options={vocabTypes.filter((item) => item !== '全部')} />
          </Form.Item>
          <Form.Item name="note" label="使用场景（可选）">
            <Input placeholder="例如：用于提出对策题中的机制建设" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
