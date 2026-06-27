/**
 * Email sending via Unisender Go transactional API.
 * Docs: https://godocs.unisender.ru/web-api-ref#email-send
 */

const UNISENDER_GO_URL = 'https://go2.unisender.ru/ru/transactional/api/v1/email/send.json'
const FROM_EMAIL = 'noreply@ychion.ru'
const FROM_NAME = 'Ychion'

interface SendEmailParams {
  to: string
  subject: string
  text: string
  html: string
}

export async function sendEmail({ to, subject, text, html }: SendEmailParams): Promise<void> {
  const apiKey = process.env.UNISENDER_GO_API_KEY
  if (!apiKey) {
    throw new Error('[Email] UNISENDER_GO_API_KEY is not configured')
  }

  const body = {
    api_key: apiKey,
    message: {
      recipients: [{ email: to }],
      body: {
        html,
        plaintext: text,
      },
      subject,
      from_email: FROM_EMAIL,
      from_name: FROM_NAME,
    },
  }

  const response = await fetch(UNISENDER_GO_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unknown')
    console.error(`[Email] Unisender Go error: ${response.status}`, errorText)
    throw new Error(`Email send failed: ${response.status}`)
  }

  const result = await response.json() as { status: string }
  if (result.status !== 'success') {
    console.error('[Email] Unisender Go rejected:', result)
    throw new Error('Email send rejected by provider')
  }
}

export async function sendOTPEmail(email: string, code: string): Promise<void> {
  const subject = 'Код для входа в Ychion'

  const text = [
    `Ваш код для входа: ${code}`,
    '',
    'Код действителен 10 минут.',
    'Если вы не запрашивали код, просто проигнорируйте это письмо.',
    '',
    '— Команда Ychion',
  ].join('\n')

  const html = `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)">
        <tr><td style="padding:32px 32px 24px;text-align:center">
          <div style="font-size:24px;font-weight:700;color:#0f172a">
            <span>Учи</span><span style="color:#8C52FF">Он</span>
          </div>
        </td></tr>
        <tr><td style="padding:0 32px;text-align:center">
          <p style="margin:0 0 8px;font-size:16px;color:#334155">Ваш код для входа:</p>
          <div style="display:inline-block;padding:16px 32px;background:#f5f3ff;border-radius:12px;margin:8px 0 16px">
            <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#8C52FF">${code}</span>
          </div>
          <p style="margin:0 0 4px;font-size:14px;color:#64748b">Код действителен 10 минут.</p>
          <p style="margin:0;font-size:13px;color:#94a3b8">Если вы не запрашивали код, проигнорируйте это письмо.</p>
        </td></tr>
        <tr><td style="padding:24px 32px 32px;text-align:center">
          <div style="border-top:1px solid #e2e8f0;padding-top:16px">
            <span style="font-size:12px;color:#94a3b8">ychion.ru</span>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  await sendEmail({ to: email, subject, text, html })
}

export async function sendWelcomeEmail(email: string): Promise<void> {
  const subject = 'Добро пожаловать в УчиОн 💜'

  const text = [
    'Здравствуйте!',
    '',
    'Вы зарегистрировались в УчиОн — ИИ-платформе для учителей и репетиторов, которая помогает быстрее готовить материалы к урокам: рабочие листы, тесты, задания и презентации.',
    '',
    'Чтобы начать работу, перейдите в личный кабинет и попробуйте создать первый материал. Для этого выберите предмет, класс, тему и нужный формат — УчиОн подготовит основу за несколько минут.',
    '',
    'Полезные ссылки:',
    'Сообщество ВКонтакте: https://vk.ru/wall-236486168_108',
    'Видеоинструкция по работе с платформой: https://vk.ru/wall-236486168_2',
    'Сайт УчиОн: https://ychion.ru/',
    '',
    'Желаем лёгкой подготовки и больше времени на главное — учеников, идеи и живой урок.',
    '',
    'Команда УчиОн',
  ].join('\n')

  const html = `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)">
        <tr><td style="padding:32px 32px 16px;text-align:center">
          <div style="font-size:24px;font-weight:700;color:#0f172a">
            <span>Учи</span><span style="color:#8C52FF">Он</span>
          </div>
        </td></tr>

        <tr><td style="padding:0 32px 8px;text-align:center">
          <h1 style="margin:0;font-size:24px;line-height:1.25;color:#0f172a">Добро пожаловать в УчиОн 💜</h1>
        </td></tr>

        <tr><td style="padding:16px 32px 0">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155">Здравствуйте!</p>

          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155">
            Вы зарегистрировались в <b>УчиОн</b> — ИИ-платформе для учителей и репетиторов, которая помогает быстрее готовить материалы к урокам: рабочие листы, тесты, задания и презентации.
          </p>

          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155">
            Чтобы начать работу, перейдите в личный кабинет и попробуйте создать первый материал. Для этого выберите предмет, класс, тему и нужный формат — УчиОн подготовит основу за несколько минут.
          </p>

          <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px">
            <tr><td align="center">
              <a href="https://ychion.ru/" style="display:inline-block;background:#8C52FF;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 24px;border-radius:12px">
                Перейти в личный кабинет
              </a>
            </td></tr>
          </table>

          <div style="background:#f8f5ff;border:1px solid #ede7ff;border-radius:14px;padding:18px 18px;margin:0 0 24px">
            <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#0f172a">Полезные ссылки:</p>

            <p style="margin:0 0 10px;font-size:14px;line-height:1.5;color:#334155">
              <a href="https://vk.ru/wall-236486168_108" style="color:#8C52FF;text-decoration:none;font-weight:600">Сообщество ВКонтакте</a>
            </p>

            <p style="margin:0 0 10px;font-size:14px;line-height:1.5;color:#334155">
              <a href="https://vk.ru/wall-236486168_2" style="color:#8C52FF;text-decoration:none;font-weight:600">Видеоинструкция по работе с платформой</a>
            </p>

            <p style="margin:0;font-size:14px;line-height:1.5;color:#334155">
              <a href="https://ychion.ru/" style="color:#8C52FF;text-decoration:none;font-weight:600">Сайт УчиОн</a>
            </p>
          </div>

          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155">
            Желаем лёгкой подготовки и больше времени на главное — учеников, идеи и живой урок.
          </p>

          <p style="margin:0;font-size:15px;line-height:1.6;color:#334155">Команда УчиОн</p>
        </td></tr>

        <tr><td style="padding:24px 32px 32px;text-align:center">
          <div style="border-top:1px solid #e2e8f0;padding-top:16px">
            <span style="font-size:12px;color:#94a3b8">ychion.ru</span>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  await sendEmail({ to: email, subject, text, html })
}
