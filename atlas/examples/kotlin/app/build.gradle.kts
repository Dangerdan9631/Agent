plugins {
    application
    id("dev.atlas.kotlin")
}

atlas {
    rootDirectory.set(rootProject.layout.projectDirectory.dir("architecture"))
    models {
        create("jvm") {
            target.set("jvm")
            compilation.set("main")
            generateOnBuild.set(true)
        }
    }
}

dependencies {
    implementation(project(":lib"))
    implementation("org.apache.commons:commons-lang3:3.17.0")
    implementation("com.fasterxml.jackson.core:jackson-databind:2.18.3")
}

application {
    mainClass.set("dev.atlas.example.app.Program")
}
