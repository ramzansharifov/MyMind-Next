export type VisualIconFamily = 'folder' | 'task' | 'habit' | 'password' | 'finance'

export const FOLDER_ICON_CHOICES = [
  { value: 'folder', label: 'Папка' },
  { value: 'book', label: 'Книга' },
  { value: 'graduation', label: 'Учёба' },
  { value: 'science', label: 'Наука' },
  { value: 'calculator', label: 'Математика' },
  { value: 'code', label: 'Программирование' },
  { value: 'languages', label: 'Языки' },
  { value: 'history', label: 'История' },
  { value: 'microscope', label: 'Исследование' },
  { value: 'art', label: 'Искусство' },
  { value: 'music', label: 'Музыка' },
  { value: 'work', label: 'Работа' },
  { value: 'archive', label: 'Архив' },
  { value: 'physics', label: 'Физика' },
  { value: 'brain', label: 'Мышление' },
  { value: 'organization', label: 'Организация' },
  { value: 'photography', label: 'Фотография' },
  { value: 'finance', label: 'Финансы' },
  { value: 'biology', label: 'Биология' },
  { value: 'geography', label: 'География' },
  { value: 'medicine', label: 'Медицина' },
  { value: 'ideas', label: 'Идеи' },
  { value: 'travel', label: 'Путешествия' },
  { value: 'notes', label: 'Заметки' },
  { value: 'design', label: 'Дизайн' },
  { value: 'projects', label: 'Проекты' },
  { value: 'law', label: 'Право' },
  { value: 'favorites', label: 'Избранное' },
  { value: 'goals', label: 'Цели' },
  { value: 'reminders', label: 'Напоминания' },
  { value: 'bookmarks', label: 'Закладки' },
  { value: 'resources', label: 'Ресурсы' },
  { value: 'calendar', label: 'Календарь' },
  { value: 'cloud', label: 'Облако' },
  { value: 'direction', label: 'Направления' },
  { value: 'database', label: 'База данных' },
  { value: 'games', label: 'Игры' },
  { value: 'home', label: 'Дом' },
  { value: 'mail', label: 'Почта' },
  { value: 'network', label: 'Сеть' },
  { value: 'security', label: 'Безопасность' },
  { value: 'shopping', label: 'Покупки' },
  { value: 'achievements', label: 'Достижения' },
  { value: 'checklist', label: 'Задачи' },
  { value: 'personal', label: 'Личное' },
  { value: 'documents', label: 'Документы' },
  { value: 'downloads', label: 'Загрузки' },
  { value: 'team', label: 'Команда' },
  { value: 'weather', label: 'Погода' },
  { value: 'sport', label: 'Спорт' }
] as const

export const TASK_GROUP_ICON_CHOICES = [
  { value: 'folder', label: 'Общее' },
  { value: 'briefcase', label: 'Работа' },
  { value: 'home', label: 'Дом' },
  { value: 'user', label: 'Личное' },
  { value: 'shopping-cart', label: 'Покупки' },
  { value: 'wallet', label: 'Финансы' },
  { value: 'book-open', label: 'Учёба' },
  { value: 'heart-pulse', label: 'Здоровье' },
  { value: 'dumbbell', label: 'Спорт' },
  { value: 'plane', label: 'Путешествия' },
  { value: 'rocket', label: 'Проекты' },
  { value: 'bell', label: 'Напоминания' }
] as const

export const HABIT_GROUP_ICON_CHOICES = [
  { value: 'folder', label: 'Папка' },
  { value: 'sparkles', label: 'Развитие' },
  { value: 'dumbbell', label: 'Спорт' },
  { value: 'book-open', label: 'Чтение' },
  { value: 'heart-pulse', label: 'Здоровье' },
  { value: 'brain', label: 'Разум' },
  { value: 'droplet', label: 'Вода' },
  { value: 'moon', label: 'Сон' },
  { value: 'sun', label: 'Утро' },
  { value: 'leaf', label: 'Баланс' },
  { value: 'music', label: 'Музыка' },
  { value: 'briefcase', label: 'Работа' },
  { value: 'home', label: 'Дом' },
  { value: 'wallet', label: 'Финансы' },
  { value: 'code', label: 'Код' },
  { value: 'user', label: 'Личное' }
] as const

export const PASSWORD_GROUP_ICON_CHOICES = [
  { value: 'folder', label: 'Папка' },
  { value: 'briefcase', label: 'Работа' },
  { value: 'home', label: 'Дом' },
  { value: 'user', label: 'Личное' },
  { value: 'globe', label: 'Интернет' },
  { value: 'code', label: 'Разработка' },
  { value: 'database', label: 'Сервисы' },
  { value: 'gamepad', label: 'Игры' },
  { value: 'shopping-cart', label: 'Покупки' },
  { value: 'wallet', label: 'Финансы' },
  { value: 'key-round', label: 'Доступы' },
  { value: 'shield', label: 'Безопасность' }
] as const

export const FINANCE_ICON_CHOICES = [
  { value: 'wallet', label: 'Кошелёк' },
  { value: 'credit-card', label: 'Карта' },
  { value: 'banknote', label: 'Наличные' },
  { value: 'landmark', label: 'Банк' },
  { value: 'piggy-bank', label: 'Копилка' },
  { value: 'coins', label: 'Монеты' },
  { value: 'shopping-cart', label: 'Покупки' },
  { value: 'utensils', label: 'Еда' },
  { value: 'car', label: 'Автомобиль' },
  { value: 'home', label: 'Дом' },
  { value: 'heart-pulse', label: 'Здоровье' },
  { value: 'graduation-cap', label: 'Обучение' },
  { value: 'briefcase', label: 'Работа' },
  { value: 'gift', label: 'Подарок' },
  { value: 'plane', label: 'Путешествия' },
  { value: 'receipt', label: 'Чек' },
  { value: 'circle-dollar-sign', label: 'Деньги' },
  { value: 'trending-up', label: 'Рост' },
  { value: 'repeat-2', label: 'Переводы' },
  { value: 'tag', label: 'Другое' }
] as const

export const TASK_GROUP_COLOR_CHOICES = [
  { value: 'accent', label: 'Без цвета' },
  { value: 'violet', label: 'Фиолетовый' },
  { value: 'blue', label: 'Синий' },
  { value: 'cyan', label: 'Голубой' },
  { value: 'emerald', label: 'Изумрудный' },
  { value: 'amber', label: 'Янтарный' },
  { value: 'orange', label: 'Оранжевый' },
  { value: 'rose', label: 'Розовый' },
  { value: 'pink', label: 'Малиновый' }
] as const

export const GROUP_COLOR_CHOICES = [
  { value: 'violet', label: 'Фиолетовый' },
  { value: 'blue', label: 'Синий' },
  { value: 'cyan', label: 'Голубой' },
  { value: 'emerald', label: 'Изумрудный' },
  { value: 'amber', label: 'Янтарный' },
  { value: 'orange', label: 'Оранжевый' },
  { value: 'rose', label: 'Красный' },
  { value: 'pink', label: 'Розовый' }
] as const
