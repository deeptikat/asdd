pipeline {
    agent any

    tools {
        nodejs 'Node 22'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        stage('Validate') {
            steps {
                sh 'npm run check'
                sh 'npm test'
            }
        }
        stage('Build containers') {
            steps {
                sh 'docker build -f backend/Dockerfile -t campusconnect-api:${BUILD_NUMBER} .'
                sh 'docker build -f frontend/Dockerfile -t campusconnect-web:${BUILD_NUMBER} .'
            }
        }
    }

    post {
        always {
            echo 'CampusConnect pipeline finished.'
        }
    }
}
