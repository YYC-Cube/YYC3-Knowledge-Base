Arduino.forBlock["io_attach_interrupt"] = function (block, generator) {
    // console.log("io_attach_interrupt");
    const pin = block.getFieldValue("PIN");
    const mode = block.getFieldValue("MODE");
    // console.log("toogle: ", block.getFieldValue("TOGGLE"));
    // const enabled = block.getFieldValue("TOGGLE") === "TRUE";
    let callback = generator.statementToCode(block, "HANDLER") || "";

    const enabled = true;

    funcName = "interrupt_handler_" + pin;
    const functionCode = `void ${funcName}() {\n${callback}\n}\n`;

    // Add the function to the generator's definitions
    generator.addFunction(funcName, functionCode);

    if (!enabled) {
        // Disable all blocks in the handler
        const handlerConnection = block.getInput('HANDLER').connection;
        if (handlerConnection && handlerConnection.targetBlock()) {
            // Recursively disable all blocks
            const disableAllBlocks = function (block) {
                if (!block) return;
                block.setEnabled(false);

                // Disable all connected blocks in each input
                for (let i = 0; i < block.inputList.length; i++) {
                    const input = block.inputList[i];
                    if (input.connection && input.connection.targetBlock()) {
                        disableAllBlocks(input.connection.targetBlock());
                    }
                }

                // Disable the next block in sequence
                if (block.nextConnection && block.nextConnection.targetBlock()) {
                    disableAllBlocks(block.nextConnection.targetBlock());
                }
            };

            disableAllBlocks(handlerConnection.targetBlock());
        }
    }

    generator.addSetupBegin(`attachInterrupt_${pin}`,
        `attachInterrupt(digitalPinToInterrupt(${pin}), ${funcName}, ${mode});`);

    return ""; // No code generated in the main loop
};

Arduino.forBlock["io_detach_interrupt"] = function (block, generator) {
    const pin = block.getFieldValue("PIN");
    generator.addLoopEnd(`detachInterrupt_${pin}`,
        `detachInterrupt(digitalPinToInterrupt(${pin}));`);
    return ""; // No code generated in the main loop
}
