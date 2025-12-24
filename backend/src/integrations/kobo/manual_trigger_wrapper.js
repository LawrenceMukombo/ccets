const { generateODKMediaFiles } = require('./generateMedia');

// Explicitly run the generator function
(async () => {
    try {
        console.log("🚀 Starting Manual Output Generation...");
        await generateODKMediaFiles();
        console.log("✅ DONE! Check the /output folder.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Failed:", err);
        process.exit(1);
    }
})();
