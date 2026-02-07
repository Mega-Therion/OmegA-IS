$tasks = @('gAIngBrain-Start', 'gAIngBrain-StartupFull', 'gAIngBrain-Sync', 'gAIngBrain-TwoWaySync', 'gAIngBrain-Ngrok')
foreach ($task in $tasks) {
  Unregister-ScheduledTask -TaskName $task -Confirm:$false -ErrorAction SilentlyContinue
}

