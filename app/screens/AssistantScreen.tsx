import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Share,
  KeyboardAvoidingView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { api, isApiError } from '../../src/services/api';
import { useFeed } from '../../src/context/FeedContext';
import { AppButton, NoticeBox } from '../../src/components/ArtistUi';
import { BottomSheet } from '../../src/components/StudioUi';
import { ComposePostSheet } from '../../src/components/ComposePostSheet';
import { deviceTz } from '../../src/utils/stats';
import { formatUsd } from '../../src/utils/insights';
import {
  AUTO_MODEL,
  AssistantModel,
  AssistantQuota,
  MAX_MESSAGE_CHARS,
  QUICK_PROMPTS,
  answeredByText,
  buyLabel,
  chatSubtitle,
  counterText,
  greetingText,
  isOutOfMessages,
  sendErrorKind,
  SendErrorKind,
} from '../../src/utils/assistant';

const PURPLE = '#7B2CBF';
const errText = (err: unknown) => (isApiError(err) ? err.message : "Can't connect to the server. Please try again.");

interface Msg {
  id: string;
  role: 'user' | 'ai';
  kind: 'text' | 'insight' | 'captions';
  text: string;
  captions?: string[];
  suggestions?: string[];
  insightId?: string | null;
  insight?: any;
  model?: string;
  modelLabel?: string;
  fallback?: boolean;
  failed?: boolean;
  pending?: boolean;
}

interface SendError {
  kind: SendErrorKind;
  message: string;
  messageId?: string;
  model?: string;
  modelLabel?: string;
  suggestedModel?: string;
  suggestedModelLabel?: string;
}

interface AssistantScreenProps {
  // Cuộc trò chuyện đang mở (giữ ở Navigation để quay lại từ bản phân tích đầy đủ)
  chatId?: string | null;
  onChatChange?: (chatId: string | null) => void;
  onBack?: () => void;
  onOpenReport?: (insightId: string) => void;
}

// AI Assistant (giai đoạn 6b, C2–C11): chat hỏi đáp với Gemini + phân tích fan trong chat
export const AssistantScreen: React.FC<AssistantScreenProps> = ({ chatId: initialChatId = null, onChatChange, onBack, onOpenReport }) => {
  const { createPost } = useFeed();
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chatId, setChatIdState] = useState<string | null>(initialChatId);
  const [chatModel, setChatModel] = useState<string>(AUTO_MODEL);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<SendError | null>(null);
  const [notCounted, setNotCounted] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  // Bảng chọn model (C10), danh sách chat (C8), mua tin (C7), menu nhấn giữ chat
  const [modelOpen, setModelOpen] = useState(false);
  const [chatsOpen, setChatsOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [buying, setBuying] = useState(false);
  const [menuChat, setMenuChat] = useState<any>(null);
  const [renameText, setRenameText] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  // Caption đang mở trong bảng viết bài
  const [postCaption, setPostCaption] = useState<string | null>(null);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const setChatId = useCallback(
    (id: string | null) => {
      setChatIdState(id);
      onChatChange?.(id);
    },
    [onChatChange]
  );

  const quota: AssistantQuota | undefined = info?.quota;
  const models: AssistantModel[] = info?.models || [];
  const modelName = (id: string) => models.find((m) => m.id === id)?.label || (id === AUTO_MODEL ? 'Auto' : id);

  const loadList = useCallback(async () => {
    const res = await api.studio.assistant.listChats(deviceTz());
    setInfo(res.data);
    return res.data;
  }, []);

  const openChat = useCallback(
    async (id: string) => {
      setSendError(null);
      setNotCounted(false);
      setNotice(null);
      const res = await api.studio.assistant.getChat(id);
      setChatId(res.data.chat.id);
      setChatModel(res.data.chat.model);
      setMessages(res.data.messages);
    },
    [setChatId]
  );

  useEffect(() => {
    (async () => {
      try {
        await loadList();
        if (initialChatId) {
          try {
            await openChat(initialChatId);
          } catch {
            setChatId(null); // chat đã bị xoá / hết hạn → cuộc trò chuyện mới
          }
        }
      } catch (err) {
        setLoadError(errText(err));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upsertChat = (chat: any) =>
    setInfo((i: any) => (i ? { ...i, chats: [chat, ...(i.chats || []).filter((c: any) => c.id !== chat.id)] } : i));

  // Gắn kết quả gửi / gửi lại vào danh sách tin
  const applyResult = (d: any, tempId?: string) => {
    setChatId(d.chat.id);
    setChatModel(d.chat.model);
    upsertChat(d.chat);
    setInfo((i: any) => (i ? { ...i, quota: d.quota } : i));
    setMessages((list) => {
      let next = list.filter((m) => m.id !== tempId);
      if (d.userMessage) {
        next = next.some((m) => m.id === d.userMessage.id) ? next.map((m) => (m.id === d.userMessage.id ? d.userMessage : m)) : [...next, d.userMessage];
      }
      return [...next, d.message];
    });
  };

  const handleError = (err: unknown, tempId?: string) => {
    const body = isApiError(err) ? err.body : null;
    if (body?.chat) {
      setChatId(body.chat.id);
      setChatModel(body.chat.model);
      upsertChat(body.chat);
    }
    if (body?.quota) setInfo((i: any) => (i ? { ...i, quota: body.quota } : i));
    if (body?.userMessage) {
      setMessages((list) => {
        const next = list.filter((m) => m.id !== tempId);
        return next.some((m) => m.id === body.userMessage.id) ? next.map((m) => (m.id === body.userMessage.id ? body.userMessage : m)) : [...next, body.userMessage];
      });
    } else if (tempId) {
      setMessages((list) => list.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)));
    }
    const kind = sendErrorKind(isApiError(err) ? err.code : undefined);
    if (kind === 'other') {
      setNotice({ tone: 'error', text: errText(err) });
      return;
    }
    setNotCounted(true);
    setSendError({
      kind,
      message: errText(err),
      messageId: body?.userMessage?.id,
      model: body?.model,
      modelLabel: body?.modelLabel,
      suggestedModel: body?.suggestedModel,
      suggestedModelLabel: body?.suggestedModelLabel,
    });
    if (kind === 'model_busy') refreshModels();
  };

  const refreshModels = async () => {
    try {
      const res = await api.studio.assistant.models();
      setInfo((i: any) => (i ? { ...i, models: res.data.models } : i));
    } catch {
      // giữ danh sách cũ
    }
  };

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || sending) return;
    if (text.length > MAX_MESSAGE_CHARS) {
      setNotice({ tone: 'error', text: `Messages can be up to ${MAX_MESSAGE_CHARS} characters.` });
      return;
    }
    setInput('');
    setSendError(null);
    setNotCounted(false);
    setNotice(null);
    const tempId = `tmp_${Date.now()}`;
    setMessages((list) => [...list, { id: tempId, role: 'user', kind: 'text', text, pending: true }]);
    setSending(true);
    try {
      const res = await api.studio.assistant.send({ chatId, text, model: chatId ? undefined : chatModel }, deviceTz());
      applyResult(res.data, tempId);
    } catch (err) {
      handleError(err, tempId);
    } finally {
      setSending(false);
    }
  };

  // Gửi lại một tin chưa được trả lời; model = đổi model của cuộc chat trước khi gửi lại (C11)
  const retry = async (messageId: string | undefined, model?: string) => {
    if (!chatId || !messageId || sending) return;
    setSendError(null);
    setNotCounted(false);
    setNotice(null);
    setSending(true);
    try {
      if (model && model !== chatModel) {
        const r = await api.studio.assistant.updateChat(chatId, { model });
        setChatModel(r.data.chat.model);
        upsertChat(r.data.chat);
      }
      const res = await api.studio.assistant.retry(chatId, messageId, deviceTz());
      applyResult(res.data);
    } catch (err) {
      handleError(err);
    } finally {
      setSending(false);
    }
  };

  const showBasicSummary = async () => {
    if (!chatId || sending) return;
    setSendError(null);
    setSending(true);
    try {
      const res = await api.studio.assistant.basicSummary(chatId, deviceTz());
      applyResult(res.data);
    } catch (err) {
      setNotice({ tone: 'error', text: errText(err) });
    } finally {
      setSending(false);
    }
  };

  const chooseModel = async (id: string) => {
    setModelOpen(false);
    if (!chatId) {
      setChatModel(id);
      return;
    }
    try {
      const r = await api.studio.assistant.updateChat(chatId, { model: id });
      setChatModel(r.data.chat.model);
      upsertChat(r.data.chat);
    } catch (err) {
      setNotice({ tone: 'error', text: errText(err) });
    }
  };

  const newChat = () => {
    setChatsOpen(false);
    setChatId(null);
    setChatModel(AUTO_MODEL);
    setMessages([]);
    setSendError(null);
    setNotCounted(false);
    setNotice(null);
  };

  const pickChat = async (id: string) => {
    setChatsOpen(false);
    try {
      await openChat(id);
    } catch (err) {
      setNotice({ tone: 'error', text: errText(err) });
    }
  };

  const confirmPurchase = async () => {
    setBuying(true);
    try {
      const res = await api.studio.assistant.purchase(deviceTz());
      setInfo((i: any) => (i ? { ...i, quota: res.data.quota } : i));
      setBuyOpen(false);
      setNotice({ tone: 'ok', text: `Payment successful – ${formatUsd(res.data.payment.amount)}. ${res.data.payment.credits} messages added.` });
      const pendingId = sendError?.kind === 'quota' ? sendError.messageId : undefined;
      setSendError(null);
      setNotCounted(false);
      if (pendingId) await retry(pendingId);
    } catch (err) {
      setBuyOpen(false);
      setNotice({ tone: 'error', text: errText(err) });
    } finally {
      setBuying(false);
    }
  };

  const copyCaption = async (text: string) => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setNotice({ tone: 'ok', text: 'Caption copied.' });
      } else {
        await Share.share({ message: text });
      }
    } catch {
      setNotice({ tone: 'error', text: "Couldn't copy the caption." });
    }
  };

  // ---- Menu nhấn giữ: đổi tên / xoá ----
  const closeMenu = () => {
    setMenuChat(null);
    setRenameText(null);
    setConfirmDelete(false);
    setMenuError(null);
  };
  const saveRename = async () => {
    if (!menuChat) return;
    try {
      const r = await api.studio.assistant.updateChat(menuChat.id, { title: renameText || '' });
      upsertChat(r.data.chat);
      closeMenu();
    } catch (err) {
      setMenuError(errText(err));
    }
  };
  const doDelete = async () => {
    if (!menuChat) return;
    try {
      await api.studio.assistant.deleteChat(menuChat.id);
      setInfo((i: any) => (i ? { ...i, chats: i.chats.filter((c: any) => c.id !== menuChat.id) } : i));
      if (menuChat.id === chatId) newChat();
      closeMenu();
    } catch (err) {
      setMenuError(errText(err));
    }
  };

  // ---------------- Hiển thị ----------------
  const out = isOutOfMessages(quota) || sendError?.kind === 'quota';
  const lastAiIndex = messages.map((m) => m.role).lastIndexOf('ai');

  const renderInsightCard = (m: Msg) => {
    const c = m.insight;
    if (!c) return <Text style={styles.muted}>This report is no longer available.</Text>;
    const s = c.sentiment || { positive: 0, neutral: 0, negative: 0 };
    return (
      <View style={styles.insightCard}>
        {c.source === 'basic' && <Text style={styles.basicTag}>Basic summary · no AI</Text>}
        <Text style={styles.insightHead}>{c.headline}</Text>
        <View style={styles.bar}>
          <View style={{ flex: s.positive || 0.0001, backgroundColor: '#16A34A' }} />
          <View style={{ flex: s.neutral || 0.0001, backgroundColor: '#CBD5E1' }} />
          <View style={{ flex: s.negative || 0.0001, backgroundColor: '#E11D48' }} />
        </View>
        <Text style={styles.insightMeta}>
          Tích cực {s.positive}% · Trung lập {s.neutral}% · Tiêu cực {s.negative}% · {c.commentCount} bình luận
        </Text>
        {!!c.overallComment && <Text style={styles.insightReview}>{c.overallComment}</Text>}
        <TouchableOpacity onPress={() => onOpenReport?.(c.id)} accessibilityLabel="View full report" style={styles.reportLink}>
          <Text style={styles.reportLinkText}>View full report ›</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderMessage = (m: Msg, index: number) => {
    if (m.role === 'user') {
      const showRetry = m.failed && !m.pending && !(sendError && sendError.messageId === m.id);
      return (
        <View key={m.id} style={styles.userWrap}>
          <View style={[styles.userBubble, m.pending && styles.pendingBubble]}>
            <Text style={styles.userText}>{m.text}</Text>
          </View>
          {showRetry && (
            <TouchableOpacity onPress={() => retry(m.id)} accessibilityLabel="Retry message">
              <Text style={styles.failedText}>Not answered · Tap to retry</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }
    const by = answeredByText(m.modelLabel || '', !!m.fallback);
    return (
      <View key={m.id} style={styles.aiWrap}>
        <View style={styles.aiBubble}>
          <View style={styles.who}>
            <View style={styles.ava}><Ionicons name="sparkles" size={10} color="#FFFFFF" /></View>
            <Text style={styles.whoText}>AI Assistant</Text>
          </View>
          {!!m.text && <Text style={styles.aiText}>{m.text}</Text>}
          {m.kind === 'insight' && renderInsightCard(m)}
          {m.kind === 'captions' &&
            (m.captions || []).map((c, i) => (
              <View key={`${m.id}c${i}`} style={styles.caption}>
                <Text style={styles.captionText}>{c}</Text>
                <View style={styles.capActions}>
                  <TouchableOpacity style={styles.capBtn} onPress={() => copyCaption(c)} accessibilityLabel={`Copy caption ${i + 1}`}>
                    <Text style={styles.capBtnText}>Copy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.capBtn, styles.capBtnPri]} onPress={() => setPostCaption(c)} accessibilityLabel={`Post caption ${i + 1} to Feed`}>
                    <Text style={[styles.capBtnText, styles.capBtnPriText]}>Post to Feed</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          {!!by && <Text style={[styles.modelTag, m.fallback && styles.modelTagWarn]}>✦ {by}</Text>}
        </View>
        {index === lastAiIndex && !sending && !sendError && !out && (m.suggestions || []).length > 0 && (
          <View style={styles.chips}>
            {(m.suggestions || []).map((s) => (
              <TouchableOpacity key={s} style={styles.chip} onPress={() => send(s)} disabled={out} accessibilityLabel={s}>
                <Text style={styles.chipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderError = () => {
    if (!sendError) return null;
    if (sendError.kind === 'model_busy') {
      const label = sendError.modelLabel || modelName(chatModel);
      return (
        <View style={[styles.aiBubble, styles.warnBubble]}>
          <Text style={styles.warnTitle}>⚠️ {label} is busy</Text>
          <Text style={styles.warnText}>Google says this model is overloaded right now. Your message wasn't counted. Switch to another model or try again in a moment.</Text>
          <View style={styles.warnActions}>
            {!!sendError.suggestedModel && (
              <TouchableOpacity
                style={[styles.warnBtn, styles.warnBtnPri]}
                onPress={() => retry(sendError.messageId, sendError.suggestedModel)}
                accessibilityLabel={`Switch to ${sendError.suggestedModelLabel} and resend`}
              >
                <Text style={[styles.warnBtnText, styles.warnBtnPriText]}>Switch to {sendError.suggestedModelLabel} & resend</Text>
              </TouchableOpacity>
            )}
            {sendError.suggestedModel !== AUTO_MODEL && (
              <TouchableOpacity style={styles.warnBtn} onPress={() => retry(sendError.messageId, AUTO_MODEL)} accessibilityLabel="Switch to Auto">
                <Text style={styles.warnBtnText}>Switch to Auto</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.warnBtn} onPress={() => retry(sendError.messageId)} accessibilityLabel="Try again">
              <Text style={styles.warnBtnText}>↻ Try again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    if (sendError.kind === 'busy') {
      const canBasic = (info?.context?.commentCount || 0) >= 10;
      return (
        <View style={[styles.aiBubble, styles.warnBubble]}>
          <Text style={styles.warnTitle}>⚠️ AI is busy</Text>
          <Text style={styles.warnText}>{sendError.message}</Text>
          <View style={styles.warnActions}>
            <TouchableOpacity style={[styles.warnBtn, styles.warnBtnPri]} onPress={() => retry(sendError.messageId)} accessibilityLabel="Try again">
              <Text style={[styles.warnBtnText, styles.warnBtnPriText]}>↻ Try again</Text>
            </TouchableOpacity>
            {canBasic && (
              <TouchableOpacity style={styles.warnBtn} onPress={showBasicSummary} accessibilityLabel="Show basic fan summary">
                <Text style={styles.warnBtnText}>Show basic fan summary</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }
    return null;
  };

  // C7: hết tin miễn phí
  const renderQuotaCard = () => (
    <View style={styles.quotaCard}>
      <Text style={styles.quotaEmoji}>⏳</Text>
      <Text style={styles.quotaTitle}>You've used today's {quota?.freeLimit ?? 20} free messages</Text>
      <Text style={styles.quotaText}>Free messages reset at midnight. Need more now?</Text>
      <AppButton label={buyLabel(quota)} onPress={() => setBuyOpen(true)} style={styles.buyBtn} />
      <Text style={styles.quotaNote}>Your chat history stays available.</Text>
    </View>
  );

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.headerSide} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Back">
        <Feather name="chevron-left" size={26} color={COLORS.textPrimary} />
      </TouchableOpacity>
      <View style={styles.headerMid}>
        <Text style={styles.headerTitle}>AI Assistant</Text>
        <TouchableOpacity
          style={styles.modelChip}
          onPress={() => {
            refreshModels();
            setModelOpen(true);
          }}
          accessibilityLabel={`AI model: ${modelName(chatModel)}`}
        >
          <Text style={styles.modelChipText}>✦ {modelName(chatModel)} ▾</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={[styles.headerSide, styles.headerRight]} onPress={() => setChatsOpen(true)} accessibilityLabel="Chats">
        <Ionicons name="menu" size={26} color={COLORS.textPrimary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="dark" />
      {header}
      {loading ? (
        <ActivityIndicator style={styles.loader} color={PURPLE} />
      ) : loadError ? (
        <View style={styles.pad}>
          <NoticeBox tone="error">{loadError}</NoticeBox>
          <AppButton label="Back" variant="outline" onPress={onBack} style={styles.mt12} />
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            ref={scrollRef}
            style={styles.chat}
            contentContainerStyle={styles.chatContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
          >
            {info && !info.aiAvailable && (
              <NoticeBox tone="warn" style={styles.mb10}>The AI isn't set up on this server yet. You can still read your saved chats.</NoticeBox>
            )}
            {messages.length === 0 && (
              <View style={styles.aiWrap}>
                <View style={styles.aiBubble}>
                  <View style={styles.who}>
                    <View style={styles.ava}><Ionicons name="sparkles" size={10} color="#FFFFFF" /></View>
                    <Text style={styles.whoText}>AI Assistant</Text>
                  </View>
                  <Text style={styles.aiText}>{greetingText(info?.artist?.name, info?.context?.commentCount || 0)}</Text>
                </View>
                <View style={styles.quick}>
                  {QUICK_PROMPTS.map((q) => (
                    <TouchableOpacity key={q} style={styles.quickBtn} onPress={() => send(q)} disabled={sending || out} accessibilityLabel={q}>
                      <Text style={styles.quickText}>{q}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            {messages.map(renderMessage)}
            {sending && (
              <View style={styles.aiWrap}>
                <View style={styles.aiBubble}>
                  <View style={styles.who}>
                    <View style={styles.ava}><Ionicons name="sparkles" size={10} color="#FFFFFF" /></View>
                    <Text style={styles.whoText}>AI Assistant</Text>
                  </View>
                  <Text style={styles.typing} accessibilityLabel="AI is typing">● ● ●</Text>
                </View>
              </View>
            )}
            {renderError()}
            {out && !sending && renderQuotaCard()}
            {!!notice && <NoticeBox tone={notice.tone} style={styles.mt8}>{notice.text}</NoticeBox>}
          </ScrollView>

          <Text style={styles.counter}>{out ? '0 free messages left today' : counterText(quota, notCounted)}</Text>
          {out ? (
            <View style={styles.lockedBar}>
              <Ionicons name="lock-closed-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.lockedText}>Daily limit reached</Text>
            </View>
          ) : (
            <View style={styles.composer}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="Ask about your fans, songs, ideas…"
                placeholderTextColor={COLORS.textMuted}
                multiline
                maxLength={MAX_MESSAGE_CHARS}
                editable={!sending}
                accessibilityLabel="Message"
                onSubmitEditing={() => send(input)}
                blurOnSubmit
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!input.trim() || sending) && styles.sendDisabled]}
                onPress={() => send(input)}
                disabled={!input.trim() || sending}
                accessibilityLabel="Send"
              >
                <Ionicons name="paper-plane-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      )}

      {/* C10: chọn model */}
      <BottomSheet visible={modelOpen} onClose={() => setModelOpen(false)}>
        <Text style={styles.sheetTitle}>Choose AI model</Text>
        <Text style={styles.sheetSub}>All models are free and use 1 message per question. Your choice is saved for this chat.</Text>
        {models.map((m) => {
          const on = m.id === chatModel;
          return (
            <TouchableOpacity key={m.id} style={[styles.modelOpt, on && styles.modelOptOn]} onPress={() => chooseModel(m.id)} accessibilityLabel={`Choose ${m.label}`}>
              <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? PURPLE : COLORS.textMuted} />
              <View style={styles.flex}>
                <View style={styles.modelRow}>
                  <Text style={styles.modelName}>{m.label}</Text>
                  {m.recommended && <Text style={[styles.tag, styles.tagRec]}>Recommended</Text>}
                  {m.busy && <Text style={[styles.tag, styles.tagBusy]}>Busy now</Text>}
                </View>
                {!!m.description && <Text style={styles.modelDesc}>{m.description}</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </BottomSheet>

      {/* C8: lịch sử trò chuyện */}
      <BottomSheet visible={chatsOpen} onClose={() => setChatsOpen(false)}>
        <View style={styles.chatsHead}>
          <Text style={styles.sheetTitle}>Chats</Text>
          <TouchableOpacity style={styles.newChat} onPress={newChat} accessibilityLabel="New chat">
            <Text style={styles.newChatText}>＋ New chat</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.chatList}>
          {(info?.chats || []).length === 0 && <Text style={styles.muted}>No chats yet.</Text>}
          {(info?.chats || []).map((c: any) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.chatItem, c.id === chatId && styles.chatItemOn]}
              onPress={() => pickChat(c.id)}
              onLongPress={() => {
                setChatsOpen(false);
                setMenuChat(c);
              }}
              delayLongPress={400}
              accessibilityLabel={`Open chat ${c.title}`}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={PURPLE} />
              <View style={styles.flex}>
                <Text style={styles.chatTitle} numberOfLines={1}>{c.title}</Text>
                <Text style={styles.chatSub}>{chatSubtitle(c.lastMessageAt, c.messageCount)}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setChatsOpen(false);
                  setMenuChat(c);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={`Chat options ${c.title}`}
              >
                <Ionicons name="ellipsis-horizontal" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={styles.sheetNote}>Chats are kept for {info?.keepDays ?? 30} days. Long-press a chat to rename or delete it.</Text>
      </BottomSheet>

      {/* Đổi tên / xoá cuộc trò chuyện */}
      <BottomSheet visible={!!menuChat} onClose={closeMenu}>
        <Text style={styles.sheetTitle} numberOfLines={1}>{menuChat?.title}</Text>
        {!!menuError && <NoticeBox tone="error" style={styles.mt8}>{menuError}</NoticeBox>}
        {renameText !== null ? (
          <>
            <TextInput
              style={styles.renameInput}
              value={renameText}
              onChangeText={setRenameText}
              maxLength={40}
              autoFocus
              accessibilityLabel="Chat name"
            />
            <AppButton label="Save name" onPress={saveRename} style={styles.mt10} />
            <AppButton label="Cancel" variant="ghost" onPress={closeMenu} />
          </>
        ) : confirmDelete ? (
          <>
            <Text style={styles.sheetSub}>Delete this chat and all its messages? This can't be undone.</Text>
            <AppButton label="Delete chat" variant="danger" onPress={doDelete} style={styles.mt10} />
            <AppButton label="Cancel" variant="ghost" onPress={closeMenu} />
          </>
        ) : (
          <>
            <AppButton label="Rename" variant="outline" onPress={() => setRenameText(menuChat?.title || '')} style={styles.mt10} />
            <AppButton label="Delete" variant="danger" onPress={() => setConfirmDelete(true)} style={styles.mt8} />
            <AppButton label="Cancel" variant="ghost" onPress={closeMenu} />
          </>
        )}
      </BottomSheet>

      {/* C7: xác nhận mua 20 tin (thanh toán giả lập như gói VIP) */}
      <BottomSheet visible={buyOpen} onClose={() => !buying && setBuyOpen(false)}>
        <Text style={styles.sheetTitle}>Buy more messages</Text>
        <View style={styles.kvCard}>
          {[
            ['Item', `${quota?.packSize ?? 20} AI Assistant messages`],
            ['Price', formatUsd(quota?.price ?? 3)],
            ['Valid', 'Never expire'],
          ].map(([k, v], i) => (
            <View key={k} style={[styles.kv, i === 2 && styles.last]}>
              <Text style={styles.k}>{k}</Text>
              <Text style={styles.v}>{v}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.sheetSub}>Extra messages are used only after your free messages for the day. Demo payment – no real money is charged.</Text>
        <AppButton label={`Confirm payment · ${formatUsd(quota?.price ?? 3)}`} onPress={confirmPurchase} loading={buying} style={styles.mt12} />
        <AppButton label="Cancel" variant="ghost" onPress={() => setBuyOpen(false)} disabled={buying} />
      </BottomSheet>

      {/* Post to Feed: bảng viết bài điền sẵn caption, nghệ sĩ tự xem lại rồi đăng */}
      <ComposePostSheet
        visible={postCaption !== null}
        artistName={info?.artist?.name || ''}
        artistAvatar={info?.artist?.avatarImage || null}
        prefill={postCaption}
        onClose={() => setPostCaption(null)}
        onSubmit={async (data) => {
          const err = await createPost(data);
          if (!err) setNotice({ tone: 'ok', text: 'Posted to the Feed.' });
          return err;
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1, minWidth: 0 },
  loader: { marginTop: 60 },
  pad: { padding: 20 },
  mt8: { marginTop: 8 },
  mt10: { marginTop: 10 },
  mt12: { marginTop: 12 },
  mb10: { marginBottom: 10 },
  last: { borderBottomWidth: 0 },
  muted: { fontSize: 13, color: COLORS.textMuted, paddingVertical: 8 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  headerSide: { width: 40 },
  headerRight: { alignItems: 'flex-end' },
  headerMid: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  modelChip: { marginTop: 3, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: '#F3E8FF', borderWidth: 1, borderColor: '#E9D5FF' },
  modelChipText: { fontSize: 12, fontWeight: '800', color: PURPLE },
  chat: { flex: 1, backgroundColor: '#F9FAFB' },
  chatContent: { padding: 14, paddingBottom: 20 },
  userWrap: { alignItems: 'flex-end', marginBottom: 10 },
  userBubble: { maxWidth: '82%', backgroundColor: PURPLE, borderRadius: 16, borderBottomRightRadius: 4, paddingHorizontal: 12, paddingVertical: 8 },
  pendingBubble: { opacity: 0.7 },
  userText: { color: '#FFFFFF', fontSize: 14, lineHeight: 20 },
  failedText: { fontSize: 11.5, color: '#E11D48', marginTop: 3, fontWeight: '700' },
  aiWrap: { alignItems: 'flex-start', marginBottom: 10 },
  aiBubble: { maxWidth: '92%', backgroundColor: '#FFFFFF', borderRadius: 16, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 10 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  ava: { width: 18, height: 18, borderRadius: 9, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  whoText: { fontSize: 11.5, fontWeight: '800', color: PURPLE },
  aiText: { fontSize: 14, lineHeight: 20, color: COLORS.textPrimary },
  typing: { fontSize: 13, color: COLORS.textMuted, letterSpacing: 2 },
  modelTag: { fontSize: 11, color: COLORS.textMuted, marginTop: 6, fontWeight: '600' },
  modelTagWarn: { color: '#D97706' },
  insightCard: { marginTop: 8, borderRadius: 12, padding: 10, backgroundColor: '#FAF5FF', borderWidth: 1, borderColor: '#E9D5FF' },
  basicTag: { alignSelf: 'flex-start', fontSize: 10.5, fontWeight: '800', color: '#92400E', backgroundColor: '#FEF3C7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, overflow: 'hidden', marginBottom: 5 },
  insightHead: { fontSize: 14.5, fontWeight: '900', color: COLORS.textPrimary, lineHeight: 20 },
  bar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 8 },
  insightMeta: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 5 },
  insightReview: { fontSize: 13, lineHeight: 19, color: COLORS.textPrimary, marginTop: 6 },
  reportLink: { marginTop: 8 },
  reportLinkText: { fontSize: 13, fontWeight: '800', color: PURPLE },
  caption: { marginTop: 8, borderRadius: 12, padding: 10, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: COLORS.border },
  captionText: { fontSize: 13.5, lineHeight: 19, color: COLORS.textPrimary },
  capActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  capBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#FFFFFF' },
  capBtnPri: { backgroundColor: PURPLE, borderColor: PURPLE },
  capBtnText: { fontSize: 12.5, fontWeight: '800', color: COLORS.textPrimary },
  capBtnPriText: { color: '#FFFFFF' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: -2 },
  chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#E9D5FF', backgroundColor: '#FFFFFF' },
  chipText: { fontSize: 12.5, color: PURPLE, fontWeight: '700' },
  quick: { alignSelf: 'stretch', gap: 8 },
  quickBtn: { borderWidth: 1, borderColor: '#E9D5FF', backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  quickText: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  warnBubble: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  warnTitle: { fontSize: 14, fontWeight: '900', color: '#92400E' },
  warnText: { fontSize: 13.5, lineHeight: 19, color: '#92400E', marginTop: 4 },
  warnActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  warnBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#FFFFFF' },
  warnBtnPri: { backgroundColor: PURPLE, borderColor: PURPLE },
  warnBtnText: { fontSize: 12.5, fontWeight: '800', color: COLORS.textPrimary },
  warnBtnPriText: { color: '#FFFFFF' },
  quotaCard: { alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginTop: 4 },
  quotaEmoji: { fontSize: 26 },
  quotaTitle: { fontSize: 15.5, fontWeight: '900', color: COLORS.textPrimary, textAlign: 'center', marginTop: 4 },
  quotaText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 },
  quotaNote: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 8 },
  buyBtn: { backgroundColor: PURPLE, alignSelf: 'stretch', marginTop: 12 },
  counter: { fontSize: 11.5, color: COLORS.textMuted, textAlign: 'center', paddingVertical: 4, backgroundColor: '#FFFFFF' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 10, borderTopWidth: 1, borderTopColor: COLORS.borderLight, backgroundColor: '#FFFFFF' },
  input: { flex: 1, minHeight: 42, maxHeight: 120, borderWidth: 1, borderColor: COLORS.border, borderRadius: 21, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: COLORS.textPrimary },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.4 },
  lockedBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderTopWidth: 1, borderTopColor: COLORS.borderLight, backgroundColor: '#F9FAFB' },
  lockedText: { fontSize: 13.5, color: COLORS.textMuted, fontWeight: '700' },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  sheetSub: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginTop: 4, marginBottom: 6 },
  sheetNote: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 10 },
  modelOpt: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 12, marginTop: 8 },
  modelOptOn: { borderColor: PURPLE, backgroundColor: '#FAF5FF' },
  modelRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  modelName: { fontSize: 14.5, fontWeight: '800', color: COLORS.textPrimary },
  modelDesc: { fontSize: 12.5, color: COLORS.textSecondary, marginTop: 3, lineHeight: 17 },
  tag: { fontSize: 10.5, fontWeight: '800', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  tagRec: { backgroundColor: '#DCFCE7', color: '#16A34A' },
  tagBusy: { backgroundColor: '#FEF3C7', color: '#D97706' },
  chatsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  newChat: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: PURPLE },
  newChatText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  chatList: { maxHeight: 360, marginTop: 8 },
  chatItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  chatItemOn: { backgroundColor: '#FAF5FF' },
  chatTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  chatSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  renameInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginTop: 10, color: COLORS.textPrimary },
  kvCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4, marginTop: 8 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  k: { fontSize: 13.5, color: COLORS.textSecondary },
  v: { fontSize: 13.5, fontWeight: '800', color: COLORS.textPrimary },
});
