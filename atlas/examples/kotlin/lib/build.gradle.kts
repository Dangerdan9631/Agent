plugins {
    `java-library`
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
    implementation("org.apache.commons:commons-lang3:3.17.0")
    implementation("com.google.guava:guava:33.4.0-jre")
}
