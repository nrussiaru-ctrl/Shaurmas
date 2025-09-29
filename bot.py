import os
import json
import re
import random
import itertools
import discord
from discord.ext import commands, tasks
import wikipedia
from googletrans import Translator
from dotenv import load_dotenv
import wavelink

# === Загрузка конфигурации ===
load_dotenv()
TOKEN = os.getenv('DISCORD_TOKEN')
LAVALINK_HOST = os.getenv('LAVALINK_HOST', '127.0.0.1')
LAVALINK_PORT = int(os.getenv('LAVALINK_PORT', 2333))
LAVALINK_PASSWORD = os.getenv('LAVALINK_PASSWORD', 'youshallnotpass')

# === Инициализация ===
intents = discord.Intents.default()
intents.message_content = True
intents.members = True

bot = commands.Bot(command_prefix='!', intents=intents, help_command=None)

# === Хранилища ===
CUSTOM_COMMANDS_FILE = "custom_commands.json"
LEVELS_FILE = "levels.json"

def load_json(file, default):
    if os.path.exists(file):
        with open(file, 'r', encoding='utf-8') as f:
            return json.load(f)
    return default

def save_json(file, data):
    with open(file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

custom_commands = load_json(CUSTOM_COMMANDS_FILE, {})
user_levels = load_json(LEVELS_FILE, {})

# === Утилиты уровней ===
def get_level_xp(level):
    return 5 * (level ** 2) + 50 * level + 100

def add_xp(user_id, xp):
    user_id = str(user_id)
    if user_id not in user_levels:
        user_levels[user_id] = {"xp": 0, "level": 1}
    user_levels[user_id]["xp"] += xp
    current = user_levels[user_id]
    while current["xp"] >= get_level_xp(current["level"]):
        current["level"] += 1
        # Уведомление можно включить, указав ID канала
        # channel = bot.get_channel(123456789)
        # if channel:
        #     bot.loop.create_task(channel.send(f"🎉 <@{user_id}> достиг {current['level']} уровня!"))
    save_json(LEVELS_FILE, user_levels)

# === Система статуса ===
STATUS_CYCLE = [
    (discord.ActivityType.playing,    "в разработке 🛠️"),
    (discord.ActivityType.watching,   "{guilds} серверов"),
    (discord.ActivityType.watching,   "{members} участников"),
    (discord.ActivityType.listening,  "!help | !play"),
    (discord.ActivityType.competing,  "за твоё внимание! 💖"),
]

@bot.event
async def on_ready():
    print(f'✅ {bot.user} успешно запущен!')
    print(f'📊 Серверов: {len(bot.guilds)}')
    total_members = sum(guild.member_count for guild in bot.guilds)
    print(f'👥 Участников: {total_members}')
    
    # Подключение к Lavalink
    try:
        node = wavelink.Node(
            uri=f"http://{LAVALINK_HOST}:{LAVALINK_PORT}",
            password=LAVALINK_PASSWORD
        )
        await wavelink.Pool.connect(client=bot, nodes=[node])
        print(f"🔗 Подключено к Lavalink: {LAVALINK_HOST}:{LAVALINK_PORT}")
    except Exception as e:
        print(f"❌ Ошибка подключения к Lavalink: {e}")
    
    # Запуск циклического статуса
    if not update_status.is_running():
        update_status.start()

@tasks.loop(seconds=30)
async def update_status():
    activity_type, text = next(update_status._status_iter)
    formatted_text = text.format(
        guilds=len(bot.guilds),
        members=sum(guild.member_count for guild in bot.guilds)
    )
    await bot.change_presence(
        activity=discord.Activity(type=activity_type, name=formatted_text)
    )

@update_status.before_loop
async def before_update_status():
    update_status._status_iter = itertools.cycle(STATUS_CYCLE)

# === Приветствие ===
@bot.event
async def on_member_join(member):
    welcome_channel = discord.utils.get(member.guild.text_channels, name="welcome")
    if not welcome_channel:
        welcome_channel = member.guild.system_channel or next(iter(member.guild.text_channels), None)
    
    if welcome_channel:
        embed = discord.Embed(
            title="Добро пожаловать!",
            description=f"Привет, {member.mention}! Рады видеть тебя на {member.guild.name}!",
            color=0x00ff00
        )
        embed.set_thumbnail(url=member.display_avatar.url)
        await welcome_channel.send(embed=embed)
    
    # Авто-роль (замените "Member" на имя вашей роли)
    role = discord.utils.get(member.guild.roles, name="Member")
    if role:
        await member.add_roles(role)

# === Модерация ===
@bot.command(name='ban')
@commands.has_permissions(ban_members=True)
async def ban(ctx, member: discord.Member, *, reason="Не указана"):
    await member.ban(reason=reason)
    await ctx.send(f"🚫 {member} забанен. Причина: {reason}")

@bot.command(name='kick')
@commands.has_permissions(kick_members=True)
async def kick(ctx, member: discord.Member, *, reason="Не указана"):
    await member.kick(reason=reason)
    await ctx.send(f"👢 {member} кикнут. Причина: {reason}")

@bot.command(name='clear')
@commands.has_permissions(manage_messages=True)
async def clear(ctx, amount: int):
    if amount > 100:
        await ctx.send("Можно удалить максимум 100 сообщений за раз.")
        return
    deleted = await ctx.channel.purge(limit=amount + 1)
    await ctx.send(f"🗑️ Удалено {len(deleted) - 1} сообщений.", delete_after=5)

# === Кастомные команды ===
@bot.command(name='addcmd')
@commands.has_permissions(administrator=True)
async def addcmd(ctx, name, *, response):
    custom_commands[name.lower()] = response
    save_json(CUSTOM_COMMANDS_FILE, custom_commands)
    await ctx.send(f"✅ Команда `!{name}` добавлена!")

@bot.command(name='delcmd')
@commands.has_permissions(administrator=True)
async def delcmd(ctx, name):
    if name.lower() in custom_commands:
        del custom_commands[name.lower()]
        save_json(CUSTOM_COMMANDS_FILE, custom_commands)
        await ctx.send(f"❌ Команда `!{name}` удалена!")
    else:
        await ctx.send("Команда не найдена.")

# === Обработка сообщений ===
@bot.event
async def on_message(message):
    if message.author.bot:
        return

    # Кастомные команды
    if message.content.startswith('!'):
        cmd = message.content[1:].split()[0].lower()
        if cmd in custom_commands:
            await message.channel.send(custom_commands[cmd])
            return

    # Система XP (игнорируем команды)
    if not message.content.startswith('!'):
        add_xp(message.author.id, random.randint(10, 25))

    await bot.process_commands(message)

# === Уровни ===
@bot.command(name='rank')
async def rank(ctx, member: discord.Member = None):
    member = member or ctx.author
    data = user_levels.get(str(member.id), {"xp": 0, "level": 1})
    xp = data["xp"]
    lvl = data["level"]
    next_xp = get_level_xp(lvl)
    
    embed = discord.Embed(title=f"Уровень {member.display_name}", color=0x00ffff)
    embed.add_field(name="Уровень", value=lvl, inline=True)
    embed.add_field(name="Опыт", value=f"{xp}/{next_xp}", inline=True)
    embed.set_thumbnail(url=member.display_avatar.url)
    await ctx.send(embed=embed)

# === Музыка ===
@bot.command(name='play')
async def play(ctx, *, query):
    if not ctx.author.voice:
        return await ctx.send("Подключись к голосовому каналу!")
    
    if not wavelink.Pool.nodes:
        return await ctx.send("❌ Музыкальный сервер недоступен.")
    
    player = ctx.voice_client
    if not player:
        player = await ctx.author.voice.channel.connect(cls=wavelink.Player)
    
    tracks = await wavelink.Playable.search(query)
    if not tracks:
        return await ctx.send("Ничего не найдено.")
    
    track = tracks[0]
    await player.play(track)
    await ctx.send(f"▶️ Включаю: **{track.title}**")

@bot.command(name='stop')
async def stop(ctx):
    player = ctx.voice_client
    if player:
        await player.disconnect()
        await ctx.send("⏹️ Музыка остановлена.")
    else:
        await ctx.send("Я не в голосовом канале.")

# === Развлечения ===
@bot.command(name='coin')
async def coin(ctx):
    result = random.choice(["Орёл", "Решка"])
    await ctx.send(f"🪙 Выпало: **{result}**")

@bot.command(name='roll')
async def roll(ctx, dice: str = "1d6"):
    try:
        rolls, limit = map(int, dice.split('d'))
        if rolls > 20 or limit > 1000:
            return await ctx.send("Слишком большие числа!")
        results = [random.randint(1, limit) for _ in range(rolls)]
        await ctx.send(f"🎲 {rolls}d{limit}: {results} (сумма: {sum(results)})")
    except:
        await ctx.send("Используй формат: `!roll 2d6`")

# === Интеграции (заглушки) ===
@bot.command(name='twitch')
async def twitch(ctx, username):
    await ctx.send(f"📺 Следим за: https://twitch.tv/{username}")

@bot.command(name='youtube')
async def youtube(ctx, channel):
    await ctx.send(f"🎥 Подписка на YouTube: https://youtube.com/@{channel}")

# === Помощь ===
@bot.command(name='help')
async def help_cmd(ctx):
    embed = discord.Embed(title="📚 Помощь по боту", color=0x00ff00)
    embed.add_field(name="Модерация", value="`!ban`, `!kick`, `!clear`", inline=False)
    embed.add_field(name="Уровни", value="`!rank`", inline=False)
    embed.add_field(name="Музыка", value="`!play <запрос>`, `!stop`", inline=False)
    embed.add_field(name="Игры", value="`!coin`, `!roll`", inline=False)
    embed.add_field(name="Интеграции", value="`!twitch <ник>`, `!youtube <канал>`", inline=False)
    embed.add_field(name="Кастом", value="Админы: `!addcmd <имя> <текст>`", inline=False)
    await ctx.send(embed=embed)

# === Запуск ===
if __name__ == "__main__":
    bot.run(TOKEN)