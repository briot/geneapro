SESSION=geneaprove-$USER

tmux -2 new-session -d -s $SESSION
tmux bind X confirm-before kill-session

# Setup a window to compile files
tmux new-window -t $SESSION:1 -n 'geneaprove' "source python_env/bin/activate; cd backend; ./manage.py runserver"
tmux split-window 'npm run watch'

tmux split-window 
tmux send-keys "source python_env/bin/activate; clear; echo 'Cb-X to kill the session'" C-m
tmux resize-pane -y 5

# Attach to session
tmux -2 attach-session -t $SESSION

