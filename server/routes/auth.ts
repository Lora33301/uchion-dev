if (params.referral) {
      const [referrer] = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(and(eq(users.referralCode, params.referral.code), isNull(users.deletedAt)))
        .limit(1)




      if (referrer && referrer.email !== params.email) {
        referredBy = referrer.id
        referredAt = new Date()
        referredIp = params.referral.ip.slice(0, 64)
        referredEmailNorm = normalizeEmail(params.email)
      }
    }




    const [newUser] = await db
      .insert(users)
      .values({
        email: params.email,
        name: params.name,
        image: params.image ?? null,
        provider: params.provider,
        providerId: params.providerId,
        emailVerified: params.emailVerified ?? null,
        role: 'user',
        generationsLeft: SUBSCRIPTION_PLANS.free.generationsPerPeriod,
        mailingConsent: params.mailingConsent,
        referredBy,
        referredAt,
        referredIp,
        referredEmailNorm,
      })
      .returning({ id: users.id, email: users.email, role: users.role })
   try {
    await sendWelcomeEmail(newUser.email)
} catch (error) {
  console.error('[Email] Failed to send welcome email:', error)
}
  return newUser 
}

  // Update existing user as needed
  const updates: Record<string, unknown> = {}


  // Link Yandex OAuth to email-created account (provider not yet set)
  if (params.provider === 'yandex' && !existing.provider) {
    updates.provider = 'yandex'
    updates.providerId = params.providerId
    if (!existing.image && params.image) {
      updates.image = params.image
    }
  }




  // Set emailVerified on first email login
