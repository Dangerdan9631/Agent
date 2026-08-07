plugins {
    application
}

dependencies {
    implementation(project(":library"))
    implementation("org.apache.commons:commons-lang3:3.17.0")
    implementation("com.google.guava:guava:33.4.0-jre")
}

application {
    mainClass.set("dev.atlas.example.app.ApplicationMain")
}
