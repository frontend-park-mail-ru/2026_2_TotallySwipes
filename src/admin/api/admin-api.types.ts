// Типы админского API OnlineConf.
// Даты приходят строкой в RFC3339 (UTC), например '2026-11-28T12:30:00Z'.

/** Область, к которой относится настройка. */
export type Scope = 'frontend' | 'gateway' | 'auth' | 'profile' | 'matching' | 'chat';

/** flag -- переключатель с раскаткой и исключениями, config -- просто значение. */
export type ConfigKind = 'flag' | 'config';

/** Тип значения. У флага всегда bool, json -- это JSON-объект. */
export type ValueType = 'bool' | 'number' | 'string' | 'array' | 'json';

/** Значение настройки. Какое именно, определяет value_type. */
export type ConfigValue = boolean | number | string | unknown[] | Record<string, unknown>;

/** Ссылка на пользователя: кто вошёл в админку, кто изменил запись или добавил исключение. */
export interface UserRef {
    /** ID пользователя в продукте. */
    user_id: number;
    /** Email пользователя. */
    email: string;
}

/** Scope с названием для интерфейса. */
export interface ScopeInfo {
    /** Код scope, который уходит в API. */
    scope: Scope;
    /** Название для интерфейса. */
    title: string;
}

/** Ограничения для value_type = number. */
export interface NumberConstraints {
    /** Минимальное значение. null или нет поля -- без нижней границы. */
    min?: number | null;
    /** Максимальное значение. null или нет поля -- без верхней границы. */
    max?: number | null;
    /** true -- допускаются только целые числа. По умолчанию false. */
    integer?: boolean;
}

/** [extra] Раскатка по регламенту. */
export interface RolloutState {
    /** ID регламента. */
    policy_id: number;
    /** Название регламента. */
    policy_name: string;
    /** Проценты ступеней по порядку, например [1, 10, 25, 50, 100]. */
    stages: number[];
    /** Индекс текущей ступени в stages. null -- раскатка ещё не начиналась. */
    stage_index: number | null;
    /** Процент следующей ступени. null -- уже 100%. */
    next_percent: number | null;
    /** Время, после которого можно подтвердить следующую ступень. */
    next_available_at: string | null;
    /** Пауза прошла, следующую ступень можно подтверждать. */
    ready_for_approval: boolean;
}

/** Строка списка настроек. */
export interface Config {
    /** ID записи. По нему открывается карточка. */
    id: number;
    /** Область, к которой относится настройка. */
    scope: Scope;
    /** Имя внутри scope: латиница в нижнем регистре, цифры и _, до 64 символов. */
    name: string;
    /** scope.name, только для чтения. */
    key: string;
    /** Флаг или конфиг. */
    kind: ConfigKind;
    /** Тип значения. У флага всегда bool. */
    value_type: ValueType;
    /** Значение. У флага value = false выключает его для всех, исключения тоже не действуют. */
    value: ConfigValue;
    /** Процент пользователей 0--100. У config всегда null. */
    rollout_percent: number | null;
    /** Ограничения для числа. null -- ограничений нет. */
    constraints: NumberConstraints | null;
    /** [extra] ID привязанного регламента раскатки. null -- регламента нет. */
    rollout_policy_id: number | null;
    /** [extra] Состояние раскатки по регламенту. null -- регламент не привязан. */
    rollout: RolloutState | null;
    /** Попадает ли настройка в продуктовый GET /api/v1/config. */
    client_visible: boolean;
    /** Описание для админов, до 1000 символов. */
    description: string;
    /** Передаётся в PUT и DELETE, чтобы не затереть чужую правку. */
    version: number;
    /** Сколько персональных исключений у флага. У config 0. */
    overrides_count: number;
    /** Когда запись создана. */
    created_at: string;
    /** Когда запись последний раз изменили. */
    updated_at: string;
    /** Кто последним изменил запись. */
    updated_by: UserRef;
}

/** Персональное правило для одного пользователя. */
export interface Override {
    /** ID пользователя, к которому относится правило. */
    user_id: number;
    /** Email этого пользователя. */
    email: string;
    /** true -- флаг у пользователя включён принудительно, false -- выключен. */
    enabled: boolean;
    /** Когда правило добавлено. */
    created_at: string;
    /** Кто добавил правило. */
    created_by: UserRef;
}

/** Карточка настройки. */
export interface ConfigDetails extends Config {
    /** Персональные исключения. У config список пустой. */
    overrides: Override[];
}

/** Тело POST /admin/configs: новая настройка. */
export interface ConfigCreate {
    /** Область, к которой относится настройка. */
    scope: Scope;
    /** Имя внутри scope: латиница в нижнем регистре, цифры и _, до 64 символов. */
    name: string;
    /** Флаг или конфиг. */
    kind: ConfigKind;
    /** Тип значения. У флага обязательно bool. */
    value_type: ValueType;
    /** Начальное значение, должно подходить под value_type. */
    value: ConfigValue;
    /** Процент пользователей 0--100. Обязателен у флага, у config не передаётся или null. */
    rollout_percent?: number | null;
    /** Ограничения для числа. */
    constraints?: NumberConstraints | null;
    /** [extra] ID регламента раскатки, только у флага. */
    rollout_policy_id?: number | null;
    /** Отдавать ли настройку в продуктовый GET /api/v1/config. По умолчанию false. */
    client_visible?: boolean;
    /** Описание для админов, до 1000 символов. По умолчанию пустая строка. */
    description?: string;
}

/** Тело PUT /admin/configs/{id}. scope, name, kind и value_type изменить нельзя. */
export interface ConfigUpdate {
    /** Новое значение, должно подходить под value_type записи. */
    value: ConfigValue;
    /** Процент пользователей 0--100, только у флага. */
    rollout_percent?: number | null;
    /** Ограничения для числа. */
    constraints?: NumberConstraints | null;
    /** [extra] ID регламента раскатки, только у флага. */
    rollout_policy_id?: number | null;
    /** Отдавать ли настройку в продуктовый GET /api/v1/config. */
    client_visible: boolean;
    /** Описание для админов, до 1000 символов. */
    description: string;
    /** version из последнего GET. Если запись уже изменили, сервер ответит 409 VERSION_CONFLICT. */
    version: number;
}

/** Фильтры списка. Если поле не задано, фильтр не применяется. */
export interface ConfigsFilter {
    /** Только записи этого scope. */
    scope?: Scope;
    /** Только флаги или только конфиги. */
    kind?: ConfigKind;
    /** Подстрока в ключе scope.name, регистр не учитывается. */
    q?: string;
}

/** Обёртка, в которой API возвращает списки. */
export interface ItemsResponse<T> {
    /** Элементы списка. */
    items: T[];
}
