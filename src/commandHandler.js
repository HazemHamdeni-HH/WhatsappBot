class CommandHandler {
    constructor(excelReader) {
        this.excelReader = excelReader;
    }

    handleCommand(command, message) {
        const trimmedCommand = command.trim().toLowerCase();
        if (trimmedCommand.startsWith('!بحث عن')) {
            const query = trimmedCommand.substring('!بحث عن'.length).trim();
            return this.search(query);
        }

        switch (trimmedCommand) {
            case '!liste':
                return this.listAllData();
            case '!help':
                return this.getHelp();
            case '!stats':
                return this.getStats();
            case '!columns':
                return this.getColumns();
            case '!reload':
                return this.reloadData();
            case '!myid':
                return `Votre ID: ${message.from}`;
            case '!groupid':
                return message.fromMe ? `ID du groupe: ${message.to}` : "Cette commande ne fonctionne que dans les groupes";
            default:
                return "الأمر غير معروف. الرجاء كتابة !help لعرض الأوامر المتاحة.";
        }
    }

    _formatRecord(record) {
        const name = record['الاسم و اللقب'];
        const phone = record['رقم الهاتف'];
        const role = record['الصفة'];
        const trip = record['الرحلة'];
        const hotel = record['الفدق'];
        const room = record['الغرفة'];

        let formatted = `*👤 ${name || 'N/A'}*\n`;
        if (phone && phone !== '*') formatted += `📱 الهاتف: ${phone}\n`;
        if (role) formatted += `🏷️ الصفة: ${role}\n`;
        if (trip && trip !== '*') formatted += `✈️ الرحلة: ${trip}\n`;
        if (hotel && hotel !== '*') formatted += `🏨 الفندق: ${hotel}\n`;
        if (room && room !== '*') formatted += `🚪 الغرفة: ${room}\n`;

        return formatted;
    }

    listAllData() {
        const data = this.excelReader.getAllData();
        if (data.length === 0) return "لم يتم العثور على بيانات.";
        let response = `*📋 قائمة بجميع ${data.length} المستخدمين:*\n\n`;
        data.forEach((row, index) => {
            response += `${index + 1}. ${this._formatRecord(row)}\n`;
        });
        return response;
    }

    search(query) {
        if (!query) return "الرجاء إدخال كلمة للبحث. مثال: !بحث عن وليد";
        const results = this.excelReader.search(query);
        if (results.length === 0) return `لم يتم العثور على نتائج لـ "${query}"`;

        let response = `*🔍 تم العثور على ${results.length} نتيجة لـ "${query}":*\n\n`;
        results.forEach((row, index) => {
            response += `${index + 1}. ${this._formatRecord(row)}\n`;
        });
        return response;
    }

    getHelp() {
        return `*🤖 الأوامر المتاحة:*\n\n` +
            `• !بحث عن [كلمة البحث] - للبحث في جميع الأعمدة\n\n` +
            `*أمثلة للبحث:*\n` +
            `• بالاسم: !بحث عن وليد\n` +
            `• بالصفة: !بحث عن مرشد\n` +
            `• بالرحلة: !بحث عن SV10\n` +
            `• بالفندق: !بحث عن منارات الغزّة\n` +
            `• بالغرفة: !بحث عن 1952\n` +
            `• بالهاتف: !بحث عن 966561459339\n\n` +
            `• !liste - لعرض جميع المستخدمين\n\n` +
            `• !help - لعرض هذه الرسالة`;
    }
}

module.exports = CommandHandler;