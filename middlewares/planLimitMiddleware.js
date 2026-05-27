// Limites padrão por categoria quando nenhum Plan estiver vinculado ao tenant
const DEFAULT_LIMITS = {
    free:       { maxUsers: 2,    maxAppointments: 100,  features: [] },
    basic:      { maxUsers: 5,    maxAppointments: 500,  features: ['Agendamento online'] },
    premium:    { maxUsers: 20,   maxAppointments: null, features: ['Agendamento online', 'Notificações WhatsApp', 'Relatórios avançados'] },
    enterprise: { maxUsers: null, maxAppointments: null, features: [] },
};

/**
 * Retorna os limites efetivos do tenant.
 * Prioridade: plano vinculado (planId) > limites padrão da categoria (planType)
 */
function getEffectiveLimits(tenant) {
    if (tenant.plan && tenant.plan.isActive) {
        return {
            maxUsers:        tenant.plan.maxUsers        ?? null,
            maxAppointments: tenant.plan.maxAppointments ?? null,
            features:        Array.isArray(tenant.plan.features) ? tenant.plan.features : [],
            source:          'plan',
            planName:        tenant.plan.name,
        };
    }
    const defaults = DEFAULT_LIMITS[tenant.planType] || DEFAULT_LIMITS.free;
    return { ...defaults, source: 'planType', planName: tenant.planType };
}

/**
 * Verifica se o tenant tem uma feature habilitada no plano.
 * Retorna true se o array de features for vazio (plano enterprise/sem restrição).
 */
function hasFeature(tenant, featureName) {
    const { features } = getEffectiveLimits(tenant);
    if (!features || features.length === 0) return true;
    return features.some(f => f.toLowerCase().includes(featureName.toLowerCase()));
}

module.exports = { getEffectiveLimits, hasFeature };
