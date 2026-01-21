class Worker {
    constructor(name, role) {
        this.name = name;
        this.role = role;
    }

    /**
     * Execute the worker's task.
     * @param {Object} mission - The Mission object
     * @param {Object} step - The specific step object
     * @returns {Promise<Object>} - The output result
     */
    async execute(mission, step) {
        throw new Error('Worker.execute() must be implemented');
    }

    /**
     * Validate if this worker can handle the instruction.
     * @param {String} instruction 
     * @returns {Boolean}
     */
    validate(instruction) {
        return true;
    }
}

module.exports = Worker;

