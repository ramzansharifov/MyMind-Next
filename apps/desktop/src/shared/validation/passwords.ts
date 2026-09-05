import { z } from 'zod'

import {
  PASSWORD_GROUP_COLORS,
  PASSWORD_GROUP_ICONS,
  PASSWORD_ITEM_TYPES
} from '../contracts/passwords'

const idSchema = z.string().uuid('Некорректный идентификатор')
const masterPasswordSchema = z
  .string()
  .min(12, 'Мастер-пароль должен содержать минимум 12 символов')
  .max(256, 'Мастер-пароль слишком длинный')

export const setupPasswordVaultInputSchema = z.object({
  masterPassword: masterPasswordSchema
})

export const unlockPasswordVaultInputSchema = z.object({
  masterPassword: z
    .string()
    .min(1, 'Введите мастер-пароль')
    .max(256, 'Мастер-пароль слишком длинный')
})

export const changeMasterPasswordInputSchema = z
  .object({
    currentMasterPassword: z.string().min(1, 'Введите текущий мастер-пароль').max(256),
    newMasterPassword: masterPasswordSchema
  })
  .refine((input) => input.currentMasterPassword !== input.newMasterPassword, {
    message: 'Новый мастер-пароль должен отличаться от текущего',
    path: ['newMasterPassword']
  })

const groupPayloadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Введите название группы')
    .max(80, 'Название группы слишком длинное'),
  icon: z.enum(PASSWORD_GROUP_ICONS),
  color: z.enum(PASSWORD_GROUP_COLORS)
})

export const createPasswordGroupInputSchema = groupPayloadSchema
export const updatePasswordGroupInputSchema = groupPayloadSchema.extend({ id: idSchema })
export const deletePasswordGroupInputSchema = z.object({ id: idSchema })

const customFieldSchema = z.object({
  label: z.string().trim().min(1, 'Укажите название дополнительного поля').max(80),
  value: z.string().max(4000, 'Значение дополнительного поля слишком длинное')
})

const itemPayloadSchema = z
  .object({
    groupId: idSchema.nullable(),
    type: z.enum(PASSWORD_ITEM_TYPES),
    title: z.string().trim().min(1, 'Введите название').max(160, 'Название слишком длинное'),
    username: z.string().trim().max(240, 'Логин слишком длинный'),
    password: z.string().min(1, 'Введите пароль').max(1024, 'Пароль слишком длинный'),
    website: z.string().trim().max(2048, 'Адрес сайта слишком длинный'),
    notes: z.string().max(20_000, 'Заметка слишком длинная'),
    tags: z
      .array(z.string().trim().min(1).max(40))
      .max(30, 'Можно добавить не более 30 тегов'),
    customFields: z
      .array(customFieldSchema)
      .max(20, 'Можно добавить не более 20 дополнительных полей'),
    favorite: z.boolean()
  })
  .superRefine((input, context) => {
    const tagKeys = input.tags.map((tag) => tag.toLocaleLowerCase('ru-RU'))
    if (new Set(tagKeys).size !== tagKeys.length) {
      context.addIssue({
        code: 'custom',
        message: 'Теги не должны повторяться',
        path: ['tags']
      })
    }

    const fieldKeys = input.customFields.map((field) => field.label.toLocaleLowerCase('ru-RU'))
    if (new Set(fieldKeys).size !== fieldKeys.length) {
      context.addIssue({
        code: 'custom',
        message: 'Названия дополнительных полей не должны повторяться',
        path: ['customFields']
      })
    }
  })

export const createPasswordItemInputSchema = itemPayloadSchema
export const updatePasswordItemInputSchema = itemPayloadSchema.safeExtend({ id: idSchema })
export const deletePasswordItemInputSchema = z.object({ id: idSchema })
export const getPasswordItemInputSchema = z.object({ id: idSchema })
export const copyPasswordItemFieldInputSchema = z.object({
  id: idSchema,
  field: z.enum(['username', 'password'])
})
export const openPasswordItemWebsiteInputSchema = z.object({ id: idSchema })

export const generatePasswordInputSchema = z
  .object({
    length: z
      .number()
      .int()
      .min(8, 'Минимальная длина — 8 символов')
      .max(128, 'Максимальная длина — 128 символов'),
    lowercase: z.boolean(),
    uppercase: z.boolean(),
    digits: z.boolean(),
    symbols: z.boolean(),
    excludeAmbiguous: z.boolean()
  })
  .superRefine((input, context) => {
    const enabled = [input.lowercase, input.uppercase, input.digits, input.symbols].filter(
      Boolean
    ).length

    if (enabled === 0) {
      context.addIssue({
        code: 'custom',
        message: 'Выберите хотя бы один набор символов'
      })
    }

    if (input.length < enabled) {
      context.addIssue({
        code: 'custom',
        message: 'Длина пароля меньше числа выбранных наборов символов',
        path: ['length']
      })
    }
  })
